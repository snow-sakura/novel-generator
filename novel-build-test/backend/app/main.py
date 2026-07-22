"""AISQA 测试平台 — FastAPI 应用入口

AI-Native 多智能体测试平台核心入口。
集成 4 支柱架构：向量数据库 + 事件总线 + MCP + RAG。
"""

import asyncio
import contextlib
import logging
from collections.abc import AsyncIterator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


@contextlib.asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """应用生命周期管理

    启动时：
    1. 初始化数据库连接
    2. 初始化 Qdrant 向量数据库集合
    3. 连接 Redis 事件总线
    4. 启动 MCP 服务器
    5. 初始化向量知识库

    关闭时：
    1. 关闭事件总线连接
    2. 关闭向量数据库连接
    3. 关闭 MCP 服务器
    """
    logger.info("🚀 AISQA 平台启动中...")

    # ===== 启动初始化 =====

    # 1. 初始化 MySQL 数据库
    from app.database import init_db

    await init_db()
    logger.info("✅ MySQL 数据库已初始化")

    # 2. 初始化 Qdrant 向量数据库
    try:
        from app.vector_db.collection_manager import global_collection_manager

        await global_collection_manager.init_all_collections()
        logger.info("✅ Qdrant 向量数据库已初始化")
    except Exception as e:
        logger.warning(f"⚠️ Qdrant 初始化失败（可稍后重试）: {e}")

    # 3. 连接 Redis 事件总线
    try:
        from app.event_bus.producer import global_producer

        await global_producer.connect()
        logger.info("✅ Redis 事件总线已连接")
    except Exception as e:
        logger.warning(f"⚠️ Redis 事件总线连接失败（事件日志模式）: {e}")

    # 4. 注册 MCP 内置工具（浏览器、文件操作等）
    try:
        from app.mcp_integration.tool_registry import global_tool_registry
        from app.mcp_integration.tools.browser import BROWSER_TOOLS

        for tool_def in BROWSER_TOOLS:
            global_tool_registry.register(
                name=tool_def["name"],
                func=tool_def["func"],
                description=tool_def["description"],
                schema=tool_def["schema"],
            )
        logger.info(f"✅ 已注册 {len(BROWSER_TOOLS)} 个 MCP 内置工具")
    except Exception as e:
        logger.warning(f"⚠️ MCP 内置工具注册失败: {e}")

    # 5. 启动 MCP 服务器（后台 FastAPI 进程，端口 8001）
    try:
        from app.mcp_integration.server import MCPServer

        mcp_server = MCPServer()
        app.state.mcp_server = mcp_server
        asyncio.create_task(mcp_server.start())
        logger.info("✅ MCP 服务器已启动 (端口 8001)")
    except Exception as e:
        logger.warning(f"⚠️ MCP 服务器启动失败: {e}")

    yield

    # ===== 关闭清理 =====
    logger.info("🛑 AISQA 平台关闭中...")

    # 1. 关闭 Qdrant 连接
    try:
        from app.vector_db.client import vector_db

        await vector_db.close()
        logger.info("✅ Qdrant 连接已关闭")
    except Exception as e:
        logger.warning(f"Qdrant 关闭异常: {e}")

    # 2. 关闭事件总线
    try:
        from app.event_bus.consumer import global_consumer

        await global_consumer.close()
        from app.event_bus.producer import global_producer

        await global_producer.close()
        logger.info("✅ 事件总线已关闭")
    except Exception as e:
        logger.warning(f"事件总线关闭异常: {e}")

    # 3. 关闭 MCP 服务器
    try:
        mcp_server = getattr(app.state, "mcp_server", None)
        if mcp_server:
            await mcp_server.stop()
            logger.info("✅ MCP 服务器已关闭")
    except Exception as e:
        logger.warning(f"MCP 服务器关闭异常: {e}")

    logger.info("👋 AISQA 平台已停止")


app = FastAPI(
    title=settings.app_name,
    description="AISQA — AI 软件质量评估平台（AI-Native 多智能体测试）",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS 中间件
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==================== 健康检查 ====================


@app.get("/api/v1/health", tags=["系统"])
async def health_check():
    """健康检查接口（含所有子系统状态）"""
    from sqlalchemy import text

    from app.database import async_session

    # 数据库健康
    db_status = "unknown"
    try:
        async with async_session() as session:
            await session.execute(text("SELECT 1"))
            db_status = "healthy"
    except Exception as e:
        db_status = f"unhealthy: {e}"

    # 向量数据库健康
    qdrant_status = "unknown"
    try:
        from app.vector_db.client import vector_db

        qdrant_status = "healthy" if await vector_db.health_check() else "unhealthy"
    except Exception as e:
        qdrant_status = f"unavailable: {e}"

    # Redis 健康
    redis_status = "unknown"
    try:
        import redis.asyncio as aioredis

        client = aioredis.from_url(settings.REDIS_URL)
        await client.ping()
        redis_status = "healthy"
        await client.close()
    except Exception as e:
        redis_status = f"unavailable: {e}"

    return {
        "status": "ok",
        "app": settings.app_name,
        "version": "1.0.0",
        "subsystem_status": {
            "database": db_status,
            "vector_db": qdrant_status,
            "event_bus": redis_status,
        },
    }


# ==================== 注册路由 ====================

from app.routers import (
    agent_endpoints,
    agents,
    ai_assistant,
    ai_db_tuning,
    assets,
    audit_logs,
    auth,
    chat,
    dashboard,
    deai,
    debate_records,
    environments,
    hermes,
    integration,
    knowledge,
    mcp_management,
    mcp_tools,
    model_providers,
    projects,
    prompts,
    requirements,
    roles,
    skills,
    test_api,
    test_app,
    test_data,
    test_executions,
    test_functional,
    test_perf,
    test_reports,
    test_security,
    test_smoke,
    test_ui,
    test_web,
    users,
    workflow_executions,
    workflow_templates,
)
from app.routers import settings as settings_router

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(roles.router)
app.include_router(projects.router)
app.include_router(audit_logs.router)
app.include_router(agents.router)
app.include_router(requirements.router)
app.include_router(environments.router)
app.include_router(assets.router)
app.include_router(knowledge.router)
app.include_router(settings_router.router)
app.include_router(test_executions.router)
app.include_router(test_reports.router)
app.include_router(mcp_tools.router)
app.include_router(model_providers.router)
app.include_router(dashboard.router)
app.include_router(prompts.router)
app.include_router(workflow_templates.router)
app.include_router(deai.router)
app.include_router(test_functional.router)
app.include_router(test_api.router)
app.include_router(test_web.router)
app.include_router(test_app.router)
app.include_router(test_perf.router)
app.include_router(test_security.router)
app.include_router(test_ui.router)
app.include_router(test_smoke.router)
app.include_router(test_data.router)

# ===== Phase 3 路由 =====

app.include_router(chat.router)
app.include_router(ai_db_tuning.router)
app.include_router(ai_assistant.router)
app.include_router(hermes.router)
app.include_router(skills.router)
app.include_router(integration.router)
app.include_router(mcp_management.router)
app.include_router(agent_endpoints.router)
app.include_router(debate_records.router)
app.include_router(workflow_executions.router)

# ===== AI-Native API 路由 =====


@app.get("/api/v1/vector-db/collections", tags=["AI-Native"])
async def get_collections():
    """获取所有向量集合信息"""
    try:
        from app.vector_db.collection_manager import global_collection_manager

        collections = await global_collection_manager.list_all_collections()
        return {"status": "ok", "collections": collections}
    except ImportError:
        return {"status": "error", "message": "向量数据库模块未就绪"}
    except Exception:
        logger.exception("获取向量集合失败")
        return {"status": "error", "message": "向量数据库查询异常，请稍后重试"}


@app.post("/api/v1/vector-db/search", tags=["AI-Native"])
async def semantic_search(query: dict):
    """语义检索测试知识

    请求体字段（支持中文/英文双通）:
        - query / 文本: 检索文本
        - collection_name / 集合: 集合名称（默认 test_case_knowledge）
        - limit / 限制: 最大返回条数（默认 5）
    """
    try:
        from app.rag_pipeline.retriever import global_context_retriever

        results = await global_context_retriever.retrieve_context(
            query=query.get("query") or query.get("文本", ""),
            collection_name=query.get("collection_name") or query.get("集合", "test_case_knowledge"),
            limit=query.get("limit") or query.get("限制", 5),
        )
        return {"status": "ok", "results": results}
    except ImportError:
        return {"status": "error", "message": "语义检索模块未就绪"}
    except Exception:
        logger.exception("语义检索失败")
        return {"status": "error", "message": "检索服务异常，请稍后重试"}


@app.post("/api/v1/agents/dispatch", tags=["AI-Native"])
async def dispatch_execution(request: dict):
    """调度智能体执行测试任务

    请求体字段（支持中文/英文双通）:
        - project_id / 项目ID: 项目唯一标识
        - project_name / 项目名称: 项目名称
        - requirement_doc / 需求文档: 需求文档内容
        - execution_mode / 执行模式: 全流程/快速检测/架构评审/用例生成
    """
    try:
        from app.agents.dispatch_controller import DispatchController

        controller = DispatchController()

        # 中文/英文 key 双通适配
        context = {
            "project_id": request.get("project_id") or request.get("项目ID"),
            "project_name": request.get("project_name") or request.get("项目名称", ""),
            "requirement_doc": request.get("requirement_doc") or request.get("需求文档", ""),
            "execution_mode": request.get("execution_mode") or request.get("执行模式", "全流程"),
        }
        result = await controller.execute(context)
        return {"status": "ok", "result": result}
    except Exception:
        logger.exception("调度执行失败")
        return {"status": "error", "message": "智能体调度执行异常，请检查配置后重试"}


@app.post("/api/v1/agents/debate", tags=["AI-Native"])
async def start_debate(request: dict):
    """启动 AI 多模型辩论

    请求体字段（支持中文/英文双通）:
        - topic / 议题: 辩论议题
        - pro_side / 正方立场: 正方立场描述
        - con_side / 反方立场: 反方立场描述
        - max_rounds / 最大轮次: 最大辩论轮数（默认 3）
    """
    try:
        from app.agents.debate_engine import DebateEngine

        engine = DebateEngine()

        # 中文/英文 key 双通适配
        arg_list = request.get("论点列表") or request.get("arguments", [])
        context = {
            "topic": request.get("topic") or request.get("议题", ""),
            "pro_side": request.get("pro_side") or (arg_list[0] if len(arg_list) > 0 else ""),
            "con_side": request.get("con_side") or (arg_list[1] if len(arg_list) > 1 else ""),
            "max_rounds": request.get("max_rounds") or request.get("最大轮次", 3),
        }
        result = await engine.execute(context)
        return {"status": "ok", "result": result}
    except Exception:
        logger.exception("辩论执行失败")
        return {"status": "error", "message": "多模型辩论服务异常，请稍后重试"}


@app.post("/api/v1/agents/execute-single", tags=["AI-Native"])
async def execute_single_agent(request: dict):
    """执行单个智能体

    请求体字段（支持中文/英文双通）:
        - agent / 智能体: 智能体名称（需求分析/测试架构/测试设计/用例编写/执行分析/质量审计/成本优化）
        - input / 输入: 传递给智能体的上下文参数
    """
    try:
        agent_name = request.get("agent") or request.get("智能体", "")
        agent_input = request.get("input") or request.get("输入", {})

        agent_mapping = {
            "需求分析": "RequirementsAnalyst",
            "测试架构": "TestArchitect",
            "测试设计": "TestDesigner",
            "用例编写": "TestCaseWriter",
            "执行分析": "ExecutionAnalyst",
            "质量审计": "QualityAuditor",
            "成本优化": "CostOptimizer",
        }
        # 也支持直接传入英文类名
        reverse_mapping = {v: k for k, v in agent_mapping.items()}

        class_name = agent_mapping.get(agent_name) or reverse_mapping.get(agent_name)
        if not class_name:
            return {"status": "error", "message": f"未知智能体: {agent_name}"}

        import importlib

        module = importlib.import_module(f"app.agents.{class_name.lower()}")
        agent_class = getattr(module, class_name, None)
        if not agent_class:
            return {"status": "error", "message": f"未找到智能体类: {class_name}"}

        instance = agent_class()
        result = await instance.execute(agent_input)
        return {"status": "ok", "result": result}
    except ImportError:
        return {"status": "error", "message": "智能体模块加载失败，请检查配置"}
    except Exception:
        logger.exception("单智能体执行失败")
        return {"status": "error", "message": "智能体执行异常，请稍后重试"}
