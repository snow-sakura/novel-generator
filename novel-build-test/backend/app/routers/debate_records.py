"""辩论记录管理 — 发起辩论、查询辩论状态与记录 CRUD"""

import datetime
import json
import logging

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.agent import AgentExecution, AgentDebateRecord
from app.schemas.phase3 import (
    DebateLaunchRequest,
    DebateRecordResponse,
    DebateRecordPage,
)
from app.schemas.base import page_from_query
from app.utils.rbac import 获取当前用户, 检查权限, 操作

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/agents/debate", tags=["辩论管理"])


# ==================== 发起辩论 ====================


@router.post("/launch")
async def debate_launch(
    request: DebateLaunchRequest,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.创建)),
):
    """发起智能体辩论 — 使用 DebateEngine 执行多轮辩论并持久化记录"""
    from app.agents.debate_engine import DebateEngine

    # 创建辩论执行记录（作为辩论容器）
    execution = AgentExecution(
        project_id=0,
        agent_name="DebateEngine",
        agent_type="debater",
        task_type=f"辩论:{request.topic[:50]}",
        status="running",
        input_data={
            "topic": request.topic,
            "pro_side": request.pro_side,
            "con_side": request.con_side,
            "max_rounds": request.max_rounds,
        },
        started_at=datetime.datetime.now(datetime.UTC),
    )
    db.add(execution)
    await db.commit()
    await db.refresh(execution)

    try:
        engine = DebateEngine()
        context = {
            "topic": request.topic,
            "pro_side": request.pro_side,
            "con_side": request.con_side,
            "max_rounds": request.max_rounds,
        }
        result = await engine.execute(context)

        # 更新执行记录
        execution.status = getattr(result, "status", "completed")
        output_content = getattr(result, "output_content", "")
        if isinstance(output_content, str):
            try:
                execution.output_data = json.loads(output_content)
            except (json.JSONDecodeError, TypeError):
                execution.output_data = {"raw": output_content}
        else:
            execution.output_data = output_content

        execution.model_used = getattr(result, "model_used", "")
        execution.prompt_tokens = getattr(result, "prompt_tokens", 0)
        execution.completion_tokens = getattr(result, "completion_tokens", 0)
        execution.cost_yuan = getattr(result, "cost_yuan", 0.0)
        execution.completed_at = datetime.datetime.now(datetime.UTC)

        # 保存辩论回合记录
        debate_data = execution.output_data or {}
        rounds_data = debate_data.get("rounds", []) if isinstance(debate_data, dict) else []
        for i, round_data in enumerate(rounds_data):
            record = AgentDebateRecord(
                execution_id=execution.id,
                round_number=i + 1,
                agent_role="正方" if i % 2 == 0 else "反方",
                stance=round_data.get("pro_argument", round_data.get("stance", "")),
                content=(
                    f"正方：{round_data.get('pro_argument', '')}\n"
                    f"反方：{round_data.get('con_argument', '')}"
                ),
                consensus_reached=round_data.get("consensus_reached", False),
                final_decision=debate_data.get("final_decision", debate_data.get("arbitration", {})),
                arbitrator_notes=debate_data.get("arbitrator_notes", ""),
            )
            db.add(record)

        await db.commit()
        await db.refresh(execution)

    except Exception as e:
        logger.exception("辩论执行异常")
        execution.status = "failed"
        execution.error_message = str(e)
        execution.completed_at = datetime.datetime.now(datetime.UTC)
        await db.commit()
        await db.refresh(execution)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"辩论执行失败: {e}",
        )

    final_consensus = False
    if isinstance(execution.output_data, dict):
        final_consensus = execution.output_data.get("final_consensus", False)

    return {
        "辩论ID": execution.id,
        "议题": request.topic,
        "状态": execution.status,
        "达成共识": final_consensus,
        "费用": execution.cost_yuan,
        "错误": execution.error_message,
    }


# ==================== 辩论状态与结果 ====================


@router.get("/{debate_id}/status")
async def debate_status(
    debate_id: int,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.读取)),
):
    """查询辩论执行状态"""
    record = await db.get(AgentExecution, debate_id)
    if not record:
        raise HTTPException(status_code=404, detail="辩论记录不存在")
    return {
        "辩论ID": record.id,
        "状态": record.status,
        "智能体": record.agent_name,
        "开始时间": record.started_at,
        "完成时间": record.completed_at,
        "错误信息": record.error_message,
    }


@router.get("/{debate_id}/result")
async def debate_result(
    debate_id: int,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.读取)),
):
    """获取辩论结果数据"""
    # 查询辩论执行记录
    execution = await db.get(AgentExecution, debate_id)
    if not execution:
        raise HTTPException(status_code=404, detail="辩论记录不存在")

    # 查询关联的辩论回合
    rounds_query = (
        select(AgentDebateRecord)
        .where(AgentDebateRecord.execution_id == debate_id)
        .order_by(AgentDebateRecord.round_number)
    )
    rounds_result = await db.execute(rounds_query)
    rounds = rounds_result.scalars().all()

    return {
        "辩论ID": execution.id,
        "议题": execution.input_data.get("topic") if execution.input_data else None,
        "状态": execution.status,
        "输出": execution.output_data,
        "回合数": len(rounds),
        "回合详情": [
            {
                "轮次": r.round_number,
                "角色": r.agent_role,
                "立场": r.stance,
                "内容摘要": r.content[:200] if r.content else "",
                "达成共识": bool(r.consensus_reached),
            }
            for r in rounds
        ],
        "模型": execution.model_used,
        "费用": execution.cost_yuan,
    }


# ==================== 辩论记录列表 ====================


@router.get("/records", response_model=DebateRecordPage)
async def debate_records_list(
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页条数"),
    status_filter: str | None = Query(None, alias="status", description="按状态筛选"),
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.读取)),
):
    """获取辩论记录列表（分页）"""
    # 查询辩论执行记录（作为辩论记录展示）
    query = select(AgentExecution).where(AgentExecution.agent_type == "debater")
    count_query = select(func.count()).select_from(AgentExecution).where(
        AgentExecution.agent_type == "debater"
    )

    if status_filter:
        query = query.where(AgentExecution.status == status_filter)
        count_query = count_query.where(AgentExecution.status == status_filter)

    query = query.order_by(desc(AgentExecution.id))
    query = query.offset((page - 1) * page_size).limit(page_size)

    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    items_result = await db.execute(query)
    executions = items_result.scalars().all()

    # 为每个辩论执行记录查找关联的 AgentDebateRecord 以丰富数据
    items: list[DebateRecordResponse] = []
    for exec_record in executions:
        # 查询该辩论的回合记录
        rounds_query = (
            select(AgentDebateRecord)
            .where(AgentDebateRecord.execution_id == exec_record.id)
            .order_by(AgentDebateRecord.round_number)
        )
        rounds_result = await db.execute(rounds_query)
        debate_rounds = rounds_result.scalars().all()

        # 构造共识状态文本
        consensus_text = None
        if debate_rounds:
            reached = any(bool(r.consensus_reached) for r in debate_rounds)
            consensus_text = "已达成共识" if reached else "未达成共识"

        items.append(DebateRecordResponse(
            id=exec_record.id,
            topic=(
                exec_record.input_data.get("topic", "")
                if isinstance(exec_record.input_data, dict)
                else ""
            ),
            models=exec_record.model_used or "deepseek-v4-flash",
            rounds=str(len(debate_rounds)),
            consensus=consensus_text,
            status=exec_record.status,
            created_by=None,
            created_at=exec_record.started_at,
            finished_at=(
                exec_record.completed_at.isoformat()
                if exec_record.completed_at
                else None
            ),
        ))

    return page_from_query(
        DebateRecordResponse,
        items=items,
        total=total,
        page=page,
        page_size=page_size,
    )


# ==================== 辩论记录详情 ====================


@router.get("/records/{debate_id}")
async def debate_record_detail(
    debate_id: int,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.读取)),
):
    """获取单个辩论记录的详细信息（含所有回合）"""
    # 查询辩论执行记录
    execution = await db.get(AgentExecution, debate_id)
    if not execution:
        raise HTTPException(status_code=404, detail="辩论记录不存在")

    # 查询关联的辩论回合
    rounds_query = (
        select(AgentDebateRecord)
        .where(AgentDebateRecord.execution_id == debate_id)
        .order_by(AgentDebateRecord.round_number)
    )
    rounds_result = await db.execute(rounds_query)
    debate_rounds = rounds_result.scalars().all()

    # 构造共识状态
    consensus_text = None
    if debate_rounds:
        reached = any(bool(r.consensus_reached) for r in debate_rounds)
        consensus_text = "已达成共识" if reached else "未达成共识"

    return {
        "辩论ID": execution.id,
        "议题": (
            execution.input_data.get("topic", "")
            if isinstance(execution.input_data, dict)
            else ""
        ),
        "正方立场": (
            execution.input_data.get("pro_side", "")
            if isinstance(execution.input_data, dict)
            else ""
        ),
        "反方立场": (
            execution.input_data.get("con_side", "")
            if isinstance(execution.input_data, dict)
            else ""
        ),
        "最大轮次": (
            execution.input_data.get("max_rounds", 3)
            if isinstance(execution.input_data, dict)
            else 3
        ),
        "状态": execution.status,
        "模型": execution.model_used,
        "费用": execution.cost_yuan,
        "达成共识": consensus_text,
        "回合列表": [
            {
                "轮次": r.round_number,
                "角色": r.agent_role,
                "立场": r.stance,
                "内容": r.content,
                "达成共识": bool(r.consensus_reached),
                "最终决策": r.final_decision,
                "仲裁者备注": r.arbitrator_notes,
            }
            for r in debate_rounds
        ],
        "开始时间": execution.started_at,
        "完成时间": execution.completed_at,
        "错误信息": execution.error_message,
    }
