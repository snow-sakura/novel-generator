"""智能体路由 — 执行智能体任务、查询执行状态、监控辩论过程"""

import datetime
import json

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.agent import AgentDebateRecord, AgentExecution
from app.utils.rbac import 操作, 检查权限

router = APIRouter(prefix="/api/v1/agents", tags=["智能体"])


# ==================== 智能体执行 ====================


@router.post("/execute", summary="执行智能体任务")
async def 执行智能体任务(
    请求: dict,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.创建)),
):
    """执行智能体任务（调度总控编排工作流）

    2.3.5: 支持传入辩论结果上下文（debate_context），自动注入下游 Agent
    """
    from app.agents.dispatch_controller import DispatchController

    项目ID = 请求.get("项目ID")
    任务类型 = 请求.get("任务类型", "快速检测")
    项目名称 = 请求.get("项目名称", "未知项目")

    if not 项目ID:
        raise HTTPException(status_code=400, detail="项目ID不能为空")

    controller = DispatchController()

    # 2.3.5: 注入辩论结果（如果已存在）
    辩论结果 = 请求.get("辩论结果")
    if 辩论结果:
        controller.set_debate_context(辩论结果)

    # 记录执行开始
    执行记录 = AgentExecution(
        project_id=项目ID,
        agent_name="调度总控",
        agent_type="orchestrator",
        task_type=任务类型,
        status="running",
        input_data=请求,
        started_at=datetime.datetime.now(datetime.UTC),
    )
    db.add(执行记录)
    await db.commit()
    await db.refresh(执行记录)

    try:
        上下文 = {
            "项目ID": f"exec_{执行记录.id}",
            "项目名称": 项目名称,
            "任务类型": 任务类型,
            "项目描述": 请求.get("项目描述", ""),
        }

        结果 = await controller.execute(上下文)

        # 更新执行记录
        执行记录.status = 结果.status if hasattr(结果, "status") else "completed"
        输出内容 = 结果.output_content if hasattr(结果, "output_content") else str(结果)
        执行记录.output_data = json.loads(输出内容) if isinstance(输出内容, str) else 输出内容
        执行记录.model_used = 结果.model_used if hasattr(结果, "model_used") else ""
        执行记录.prompt_tokens = 结果.prompt_tokens if hasattr(结果, "prompt_tokens") else 0
        执行记录.completion_tokens = 结果.completion_tokens if hasattr(结果, "completion_tokens") else 0
        执行记录.cost_yuan = 结果.cost_yuan if hasattr(结果, "cost_yuan") else 0.0
        执行记录.completed_at = datetime.datetime.now(datetime.UTC)

        # 保存元数据
        if hasattr(结果, "metadata") and 结果.metadata:
            执行记录.output_data["元数据"] = 结果.metadata

    except Exception as e:
        执行记录.status = "failed"
        执行记录.error_message = str(e)
        执行记录.completed_at = datetime.datetime.now(datetime.UTC)

    await db.commit()
    await db.refresh(执行记录)

    return {
        "执行ID": 执行记录.id,
        "状态": 执行记录.status,
        "智能体": "调度总控",
        "任务类型": 任务类型,
        "输出": 执行记录.output_data,
        "费用": 执行记录.cost_yuan,
        "错误": 执行记录.error_message,
    }


# ==================== 辩论执行 ====================


@router.post("/debate", summary="发起智能体辩论")
async def 发起辩论(
    请求: dict,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.创建)),
):
    """发起质量门禁辩论"""
    from app.agents.debate_engine import DebateEngine

    议题 = 请求.get("议题", "")
    正方观点 = 请求.get("正方观点", "")
    反方观点 = 请求.get("反方观点", "")
    执行ID = 请求.get("执行ID")

    if not 议题:
        raise HTTPException(status_code=400, detail="议题不能为空")

    engine = DebateEngine()
    辩论上下文 = {
        "议题": 议题,
        "论点列表": [正方观点, 反方观点] if 正方观点 and 反方观点 else [],
        "最大轮次": 3,
    }
    结果 = await engine.execute(辩论上下文)

    # 保存辩论记录
    辩论记录列表 = []
    if hasattr(结果, "output_content") and 结果.output_content:
        try:
            输出数据 = json.loads(结果.output_content) if isinstance(结果.output_content, str) else 结果.output_content
            for i, 回合 in enumerate(输出数据.get("rounds", [])):
                记录 = AgentDebateRecord(
                    execution_id=执行ID or 0,
                    round_number=i + 1,
                    agent_role="正方" if i % 2 == 1 else "反方",
                    stance=回合.get("pro_argument", ""),
                    content=f"正方：{回合.get('pro_argument', '')}\n反方：{回合.get('con_argument', '')}",
                    consensus_reached=回合.get("consensus_reached", False),
                )
                db.add(记录)
                辩论记录列表.append(
                    {
                        "轮次": i + 1,
                        "正方论点": 回合.get("pro_argument", "")[:200],
                        "反方论点": 回合.get("con_argument", "")[:200],
                        "共识度": 回合.get("consensus_score", 0),
                        "达成共识": 回合.get("consensus_reached", False),
                    }
                )
        except Exception:
            pass

    await db.commit()

    # 从 AgentResult 中提取辩论结果
    final_consensus = False
    if hasattr(结果, "output_content") and 结果.output_content:
        try:
            输出数据 = json.loads(结果.output_content) if isinstance(结果.output_content, str) else 结果.output_content
            final_consensus = 输出数据.get("final_consensus", False) if isinstance(输出数据, dict) else False
        except Exception:
            pass

    return {
        "议题": 议题,
        "辩论轮次": len(辩论记录列表),
        "达成共识": final_consensus,
        "最终决策": "已达成共识" if final_consensus else "未达成共识",
        "回合详情": 辩论记录列表,
    }


# ==================== 执行查询 ====================


@router.get("/executions", summary="获取智能体执行列表")
async def 获取执行列表(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    project_id: int | None = Query(None),
    status: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.读取)),
):
    """获取智能体执行记录列表"""
    query = select(AgentExecution)
    count_query = select(func.count()).select_from(AgentExecution)

    if project_id:
        query = query.where(AgentExecution.project_id == project_id)
        count_query = count_query.where(AgentExecution.project_id == project_id)
    if status:
        query = query.where(AgentExecution.status == status)
        count_query = count_query.where(AgentExecution.status == status)

    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    query = query.order_by(desc(AgentExecution.started_at))
    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    items = list(result.scalars().all())

    return {
        "items": [
            {
                "id": item.id,
                "项目ID": item.project_id,
                "智能体名称": item.agent_name,
                "任务类型": item.task_type,
                "状态": item.status,
                "费用": item.cost_yuan,
                "模型": item.model_used,
                "开始时间": str(item.started_at) if item.started_at else None,
                "完成时间": str(item.completed_at) if item.completed_at else None,
                "错误": item.error_message,
            }
            for item in items
        ],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.get("/executions/{执行ID}", summary="获取执行详情")
async def 获取执行详情(
    执行ID: int,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.读取)),
):
    """获取智能体执行详情"""
    result = await db.execute(select(AgentExecution).where(AgentExecution.id == 执行ID))
    执行 = result.scalar_one_or_none()
    if not 执行:
        raise HTTPException(status_code=404, detail="执行记录不存在")

    return {
        "id": 执行.id,
        "项目ID": 执行.project_id,
        "智能体名称": 执行.agent_name,
        "任务类型": 执行.task_type,
        "状态": 执行.status,
        "输入": 执行.input_data,
        "输出": 执行.output_data,
        "模型": 执行.model_used,
        "提示token": 执行.prompt_tokens,
        "完成token": 执行.completion_tokens,
        "费用": 执行.cost_yuan,
        "开始时间": str(执行.started_at) if 执行.started_at else None,
        "完成时间": str(执行.completed_at) if 执行.completed_at else None,
        "错误": 执行.error_message,
    }


@router.get("/debates", summary="获取辩论记录")
async def 获取辩论记录(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    execution_id: int | None = Query(None),
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.读取)),
):
    """获取辩论记录列表"""
    query = select(AgentDebateRecord)
    count_query = select(func.count()).select_from(AgentDebateRecord)

    if execution_id:
        query = query.where(AgentDebateRecord.execution_id == execution_id)
        count_query = count_query.where(AgentDebateRecord.execution_id == execution_id)

    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    query = query.order_by(AgentDebateRecord.round_number)
    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    items = list(result.scalars().all())

    return {
        "items": [
            {
                "id": item.id,
                "执行ID": item.execution_id,
                "轮次": item.round_number,
                "角色": item.agent_role,
                "立场": item.stance,
                "内容": item.content[:500],
                "达成共识": item.consensus_reached,
            }
            for item in items
        ],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


# ==================== 成本统计 ====================


@router.get("/costs", summary="获取智能体成本统计")
async def 获取成本统计(
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.读取)),
):
    """获取智能体调用成本统计"""
    result = await db.execute(
        select(
            func.sum(AgentExecution.cost_yuan),
            func.sum(AgentExecution.prompt_tokens),
            func.sum(AgentExecution.completion_tokens),
            func.count(AgentExecution.id),
        )
    )
    统计 = result.one()

    return {
        "总费用": float(统计[0] or 0),
        "总提示token": int(统计[1] or 0),
        "总完成token": int(统计[2] or 0),
        "总调用次数": int(统计[3] or 0),
    }
