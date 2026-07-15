"""专用智能体端点 — 为每个 AI Agent 提供独立的 REST 接口"""

import datetime
import json
import logging

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.agent import AgentExecution
from app.schemas.phase3 import AgentAnalyzeRequest, AgentAnalyzeResponse
from app.utils.rbac import 获取当前用户, 检查权限, 操作

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/agents", tags=["智能体专用"])


# ==================== 通用辅助 ====================


async def _create_execution(
    db: AsyncSession,
    project_id: int,
    agent_name: str,
    agent_type: str,
    task_type: str,
    input_data: dict,
) -> AgentExecution:
    """创建执行记录并写入数据库"""
    record = AgentExecution(
        project_id=project_id,
        agent_name=agent_name,
        agent_type=agent_type,
        task_type=task_type,
        status="running",
        input_data=input_data,
        started_at=datetime.datetime.now(datetime.UTC),
    )
    db.add(record)
    await db.commit()
    await db.refresh(record)
    return record


async def _finish_execution(
    db: AsyncSession,
    record: AgentExecution,
    result,
) -> None:
    """将 AgentResult 回填到执行记录"""
    record.status = getattr(result, "status", "completed")
    output = getattr(result, "output_content", "")
    if isinstance(output, str):
        try:
            record.output_data = json.loads(output)
        except (json.JSONDecodeError, TypeError):
            record.output_data = {"raw": output}
    else:
        record.output_data = output
    record.model_used = getattr(result, "model_used", "")
    record.prompt_tokens = getattr(result, "prompt_tokens", 0)
    record.completion_tokens = getattr(result, "completion_tokens", 0)
    record.cost_yuan = getattr(result, "cost_yuan", 0.0)
    record.completed_at = datetime.datetime.now(datetime.UTC)
    await db.commit()
    await db.refresh(record)


async def _fail_execution(
    db: AsyncSession,
    record: AgentExecution,
    error: str,
) -> None:
    """标记执行记录为失败状态"""
    record.status = "failed"
    record.error_message = str(error)
    record.completed_at = datetime.datetime.now(datetime.UTC)
    await db.commit()
    await db.refresh(record)


# ==================== Requirements Analyst ====================


@router.post("/requirements/analyze", response_model=AgentAnalyzeResponse)
async def requirements_analyze(
    request: AgentAnalyzeRequest,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.创建)),
):
    """需求分析 — 解析 PRD/需求文档，提取功能点和测试要点"""
    from app.agents.requirements_analyst import RequirementsAnalyst

    record = await _create_execution(
        db,
        project_id=request.project_id,
        agent_name="RequirementsAnalyst",
        agent_type="analyzer",
        task_type="需求分析",
        input_data={"input_data": request.input_data},
    )

    try:
        instance = RequirementsAnalyst()
        result = await instance.execute({"input": request.input_data})
        await _finish_execution(db, record, result)
    except Exception as e:
        logger.exception("需求分析执行异常")
        await _fail_execution(db, record, str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"需求分析执行失败: {e}",
        )

    return AgentAnalyzeResponse(
        agent_name="RequirementsAnalyst",
        status=record.status,
        result=record.output_data or {},
    )


@router.get("/requirements/{execution_id}/status")
async def requirements_status(
    execution_id: int,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.读取)),
):
    """查询需求分析执行状态"""
    record = await db.get(AgentExecution, execution_id)
    if not record:
        raise HTTPException(status_code=404, detail="执行记录不存在")
    return {
        "执行ID": record.id,
        "状态": record.status,
        "智能体": record.agent_name,
        "开始时间": record.started_at,
        "完成时间": record.completed_at,
        "错误信息": record.error_message,
    }


@router.get("/requirements/{execution_id}/result")
async def requirements_result(
    execution_id: int,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.读取)),
):
    """获取需求分析结果"""
    record = await db.get(AgentExecution, execution_id)
    if not record:
        raise HTTPException(status_code=404, detail="执行记录不存在")
    return {
        "执行ID": record.id,
        "状态": record.status,
        "输出": record.output_data,
        "模型": record.model_used,
        "费用": record.cost_yuan,
    }


# ==================== Test Architect ====================


@router.post("/architect/design")
async def architect_design(
    request: AgentAnalyzeRequest,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.创建)),
):
    """测试架构设计 — 基于需求生成测试架构方案"""
    from app.agents.test_architect import TestArchitect

    record = await _create_execution(
        db,
        project_id=request.project_id,
        agent_name="TestArchitect",
        agent_type="architect",
        task_type="测试架构设计",
        input_data={"input_data": request.input_data},
    )

    try:
        instance = TestArchitect()
        result = await instance.execute({"input": request.input_data})
        await _finish_execution(db, record, result)
    except Exception as e:
        logger.exception("测试架构设计执行异常")
        await _fail_execution(db, record, str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"测试架构设计失败: {e}",
        )

    return {
        "执行ID": record.id,
        "状态": record.status,
        "智能体": "TestArchitect",
        "输出": record.output_data,
        "费用": record.cost_yuan,
    }


@router.get("/architect/{execution_id}/status")
async def architect_status(
    execution_id: int,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.读取)),
):
    """查询测试架构设计状态"""
    record = await db.get(AgentExecution, execution_id)
    if not record:
        raise HTTPException(status_code=404, detail="执行记录不存在")
    return {
        "执行ID": record.id,
        "状态": record.status,
        "智能体": record.agent_name,
        "开始时间": record.started_at,
        "完成时间": record.completed_at,
        "错误信息": record.error_message,
    }


@router.get("/architect/{execution_id}/result")
async def architect_result(
    execution_id: int,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.读取)),
):
    """获取测试架构设计结果"""
    record = await db.get(AgentExecution, execution_id)
    if not record:
        raise HTTPException(status_code=404, detail="执行记录不存在")
    return {
        "执行ID": record.id,
        "状态": record.status,
        "输出": record.output_data,
        "模型": record.model_used,
        "费用": record.cost_yuan,
    }


# ==================== Test Designer ====================


@router.post("/designer/design")
async def designer_design(
    request: AgentAnalyzeRequest,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.创建)),
):
    """测试场景设计 — 根据架构设计生成测试场景"""
    from app.agents.test_designer import TestDesigner

    record = await _create_execution(
        db,
        project_id=request.project_id,
        agent_name="TestDesigner",
        agent_type="designer",
        task_type="测试场景设计",
        input_data={"input_data": request.input_data},
    )

    try:
        instance = TestDesigner()
        result = await instance.execute({"input": request.input_data})
        await _finish_execution(db, record, result)
    except Exception as e:
        logger.exception("测试场景设计执行异常")
        await _fail_execution(db, record, str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"测试场景设计失败: {e}",
        )

    return {
        "执行ID": record.id,
        "状态": record.status,
        "智能体": "TestDesigner",
        "输出": record.output_data,
        "费用": record.cost_yuan,
    }


@router.get("/designer/{execution_id}/status")
async def designer_status(
    execution_id: int,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.读取)),
):
    """查询测试场景设计状态"""
    record = await db.get(AgentExecution, execution_id)
    if not record:
        raise HTTPException(status_code=404, detail="执行记录不存在")
    return {
        "执行ID": record.id,
        "状态": record.status,
        "智能体": record.agent_name,
        "开始时间": record.started_at,
        "完成时间": record.completed_at,
        "错误信息": record.error_message,
    }


@router.get("/designer/{execution_id}/result")
async def designer_result(
    execution_id: int,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.读取)),
):
    """获取测试场景设计结果"""
    record = await db.get(AgentExecution, execution_id)
    if not record:
        raise HTTPException(status_code=404, detail="执行记录不存在")
    return {
        "执行ID": record.id,
        "状态": record.status,
        "输出": record.output_data,
        "模型": record.model_used,
        "费用": record.cost_yuan,
    }


# ==================== TestCase Writer ====================


@router.post("/casewriter/generate")
async def casewriter_generate(
    request: AgentAnalyzeRequest,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.创建)),
):
    """测试用例生成 — 根据测试场景生成详细测试用例"""
    from app.agents.test_case_writer import TestCaseWriter

    record = await _create_execution(
        db,
        project_id=request.project_id,
        agent_name="TestCaseWriter",
        agent_type="writer",
        task_type="测试用例生成",
        input_data={"input_data": request.input_data},
    )

    try:
        instance = TestCaseWriter()
        result = await instance.execute({"input": request.input_data})
        await _finish_execution(db, record, result)
    except Exception as e:
        logger.exception("测试用例生成执行异常")
        await _fail_execution(db, record, str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"测试用例生成失败: {e}",
        )

    output_data = record.output_data or {}
    case_count = 0
    if isinstance(output_data, dict):
        case_count = len(output_data.get("test_cases", output_data.get("cases", [])))
    elif isinstance(output_data, list):
        case_count = len(output_data)

    return {
        "执行ID": record.id,
        "状态": record.status,
        "智能体": "TestCaseWriter",
        "输出": output_data,
        "用例数": case_count,
        "费用": record.cost_yuan,
    }


@router.get("/casewriter/{execution_id}/status")
async def casewriter_status(
    execution_id: int,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.读取)),
):
    """查询测试用例生成状态"""
    record = await db.get(AgentExecution, execution_id)
    if not record:
        raise HTTPException(status_code=404, detail="执行记录不存在")
    return {
        "执行ID": record.id,
        "状态": record.status,
        "智能体": record.agent_name,
        "开始时间": record.started_at,
        "完成时间": record.completed_at,
        "错误信息": record.error_message,
    }


@router.get("/casewriter/{execution_id}/result")
async def casewriter_result(
    execution_id: int,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.读取)),
):
    """获取测试用例生成结果"""
    record = await db.get(AgentExecution, execution_id)
    if not record:
        raise HTTPException(status_code=404, detail="执行记录不存在")
    return {
        "执行ID": record.id,
        "状态": record.status,
        "输出": record.output_data,
        "模型": record.model_used,
        "费用": record.cost_yuan,
    }


@router.post("/casewriter/{execution_id}/import")
async def casewriter_import(
    execution_id: int,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.创建)),
):
    """导入测试用例 — 将生成的用例导入到测试管理系统"""
    record = await db.get(AgentExecution, execution_id)
    if not record:
        raise HTTPException(status_code=404, detail="执行记录不存在")

    output_data = record.output_data or {}
    case_count = 0
    if isinstance(output_data, dict):
        case_count = len(output_data.get("test_cases", output_data.get("cases", [])))
    elif isinstance(output_data, list):
        case_count = len(output_data)

    mock_import_result = {
        "导入状态": "成功",
        "导入用例数": case_count,
        "目标系统": "TestRail",
        "导入时间": datetime.datetime.now(datetime.UTC).isoformat(),
    }
    logger.info(
        "测试用例导入 mock: execution_id=%d, result=%s",
        execution_id,
        mock_import_result,
    )

    return {
        "执行ID": record.id,
        "导入结果": mock_import_result,
    }


# ==================== Execution Analyst ====================


@router.post("/execution/analyze")
async def execution_analyze(
    request: AgentAnalyzeRequest,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.创建)),
):
    """执行分析 — 分析测试执行结果，识别失败原因并生成缺陷报告"""
    from app.agents.execution_analyst import ExecutionAnalyst

    record = await _create_execution(
        db,
        project_id=request.project_id,
        agent_name="ExecutionAnalyst",
        agent_type="analyst",
        task_type="执行分析",
        input_data={"input_data": request.input_data},
    )

    try:
        instance = ExecutionAnalyst()
        result = await instance.execute({"input": request.input_data})
        await _finish_execution(db, record, result)
    except Exception as e:
        logger.exception("执行分析异常")
        await _fail_execution(db, record, str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"执行分析失败: {e}",
        )

    return {
        "执行ID": record.id,
        "状态": record.status,
        "智能体": "ExecutionAnalyst",
        "输出": record.output_data,
        "费用": record.cost_yuan,
    }


@router.get("/execution/{execution_id}/status")
async def execution_status(
    execution_id: int,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.读取)),
):
    """查询执行分析状态"""
    record = await db.get(AgentExecution, execution_id)
    if not record:
        raise HTTPException(status_code=404, detail="执行记录不存在")
    return {
        "执行ID": record.id,
        "状态": record.status,
        "智能体": record.agent_name,
        "开始时间": record.started_at,
        "完成时间": record.completed_at,
        "错误信息": record.error_message,
    }


@router.get("/execution/{execution_id}/result")
async def execution_result(
    execution_id: int,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.读取)),
):
    """获取执行分析结果"""
    record = await db.get(AgentExecution, execution_id)
    if not record:
        raise HTTPException(status_code=404, detail="执行记录不存在")
    return {
        "执行ID": record.id,
        "状态": record.status,
        "输出": record.output_data,
        "模型": record.model_used,
        "费用": record.cost_yuan,
    }


# ==================== Quality Auditor ====================


@router.post("/quality/audit")
async def quality_audit(
    request: AgentAnalyzeRequest,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.创建)),
):
    """质量审计 — 质量评分与合规检查，评估测试覆盖率和缺陷密度"""
    from app.agents.quality_auditor import QualityAuditor

    record = await _create_execution(
        db,
        project_id=request.project_id,
        agent_name="QualityAuditor",
        agent_type="auditor",
        task_type="质量审计",
        input_data={"input_data": request.input_data},
    )

    try:
        instance = QualityAuditor()
        result = await instance.execute({"input": request.input_data})
        await _finish_execution(db, record, result)
    except Exception as e:
        logger.exception("质量审计执行异常")
        await _fail_execution(db, record, str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"质量审计失败: {e}",
        )

    return {
        "执行ID": record.id,
        "状态": record.status,
        "智能体": "QualityAuditor",
        "输出": record.output_data,
        "费用": record.cost_yuan,
    }


@router.get("/quality/{execution_id}/status")
async def quality_status(
    execution_id: int,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.读取)),
):
    """查询质量审计状态"""
    record = await db.get(AgentExecution, execution_id)
    if not record:
        raise HTTPException(status_code=404, detail="执行记录不存在")
    return {
        "执行ID": record.id,
        "状态": record.status,
        "智能体": record.agent_name,
        "开始时间": record.started_at,
        "完成时间": record.completed_at,
        "错误信息": record.error_message,
    }


@router.get("/quality/{execution_id}/result")
async def quality_result(
    execution_id: int,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.读取)),
):
    """获取质量审计结果"""
    record = await db.get(AgentExecution, execution_id)
    if not record:
        raise HTTPException(status_code=404, detail="执行记录不存在")
    return {
        "执行ID": record.id,
        "状态": record.status,
        "输出": record.output_data,
        "模型": record.model_used,
        "费用": record.cost_yuan,
    }


# ==================== Cost Optimizer ====================


@router.get("/cost/overview")
async def cost_overview(
    当前用户: dict = Depends(检查权限(操作.读取)),
):
    """成本概览 — 返回模拟的成本总体概况"""
    mock = {
        "总费用": 128.50,
        "本月费用": 32.40,
        "预算上限": 500.00,
        "预算使用率": "6.48%",
        "智能体调用次数": 1247,
        "平均每次调用费用": 0.103,
        "费用趋势": "stable",
    }
    logger.info("返回成本概览 mock 数据")
    return mock


@router.get("/cost/trend")
async def cost_trend(
    当前用户: dict = Depends(检查权限(操作.读取)),
):
    """成本趋势 — 返回模拟的成本变化趋势"""
    mock = {
        "趋势": "逐日下降",
        "数据点": [
            {"日期": "2026-07-09", "费用": 12.5},
            {"日期": "2026-07-10", "费用": 11.2},
            {"日期": "2026-07-11", "费用": 10.8},
            {"日期": "2026-07-12", "费用": 9.5},
            {"日期": "2026-07-13", "费用": 8.3},
            {"日期": "2026-07-14", "费用": 7.9},
            {"日期": "2026-07-15", "费用": 6.8},
        ],
        "日均费用": 9.57,
        "周环比": "-12.3%",
    }
    logger.info("返回成本趋势 mock 数据")
    return mock


@router.get("/cost/distribution")
async def cost_distribution(
    当前用户: dict = Depends(检查权限(操作.读取)),
):
    """成本分布 — 返回模拟的各智能体/模型成本分布"""
    mock = {
        "按智能体": [
            {"智能体": "RequirementsAnalyst", "费用": 18.2, "占比": "14.2%"},
            {"智能体": "TestArchitect", "费用": 22.5, "占比": "17.5%"},
            {"智能体": "TestDesigner", "费用": 15.8, "占比": "12.3%"},
            {"智能体": "TestCaseWriter", "费用": 35.6, "占比": "27.7%"},
            {"智能体": "ExecutionAnalyst", "费用": 20.4, "占比": "15.9%"},
            {"智能体": "QualityAuditor", "费用": 16.0, "占比": "12.4%"},
        ],
        "按模型": [
            {"模型": "deepseek-v4-flash", "费用": 85.3, "占比": "66.4%"},
            {"模型": "deepseek-v4-pro", "费用": 43.2, "占比": "33.6%"},
        ],
    }
    logger.info("返回成本分布 mock 数据")
    return mock


@router.get("/cost/suggestions")
async def cost_suggestions(
    当前用户: dict = Depends(检查权限(操作.读取)),
):
    """成本优化建议 — 返回模拟的优化建议列表"""
    mock = {
        "建议列表": [
            {
                "优先级": "高",
                "建议": "将简单查询任务迁移到 deepseek-v4-flash 以降低成本",
                "预期节省": "约 30%",
                "难度": "低",
            },
            {
                "优先级": "高",
                "建议": "开启响应缓存，相同请求避免重复调用",
                "预期节省": "约 15%",
                "难度": "中",
            },
            {
                "优先级": "中",
                "建议": "合并相似的分析请求，减少独立调用次数",
                "预期节省": "约 10%",
                "难度": "中",
            },
            {
                "优先级": "中",
                "建议": "使用结构化输出约束减少无效 token 消耗",
                "预期节省": "约 8%",
                "难度": "低",
            },
            {
                "优先级": "低",
                "建议": "对非实时任务启用异步批量处理",
                "预期节省": "约 5%",
                "难度": "高",
            },
        ],
        "总预期节省": "约 68%",
        "说明": "以上为基于调用日志的模拟优化建议，实际效果可能因场景而异",
    }
    logger.info("返回成本优化建议 mock 数据")
    return mock
