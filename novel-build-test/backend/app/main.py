"""AISQA 测试平台 — FastAPI 应用入口

AI-Native 多智能体测试平台核心入口。
集成 4 支柱架构：向量数据库 + 事件总线 + MCP + RAG。
"""

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

    # 4. 启动 MCP 服务器（后台任务）
    try:
        from app.mcp_integration.server import MCPServer
        mcp_server = MCPServer()
        logger.info("✅ MCP 服务器就绪")
    except Exception as e:
        logger.warning(f"⚠️ MCP 服务器初始化失败: {e}")

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
        "子系统状态": {
            "数据库": db_status,
            "向量数据库": qdrant_status,
            "事件总线": redis_status,
        },
    }


# ==================== 注册路由 ====================

from app.routers import auth, projects, audit_logs, agents, requirements, environments, assets

app.include_router(auth.router)
app.include_router(projects.router)
app.include_router(audit_logs.router)
app.include_router(agents.router)
app.include_router(requirements.router)
app.include_router(environments.router)
app.include_router(assets.router)

# ===== AI-Native API 路由 =====


@app.get("/api/v1/vector-db/collections", tags=["AI-Native"])
async def get_collections():
    """获取所有向量集合信息"""
    try:
        from app.vector_db.collection_manager import global_collection_manager
        collections = await global_collection_manager.list_all_collections()
        return {"状态": "ok", "集合列表": collections}
    except Exception as e:
        return {"状态": "error", "消息": str(e)}


@app.post("/api/v1/vector-db/search", tags=["AI-Native"])
async def semantic_search(query: dict):
    """语义检索测试知识"""
    try:
        from app.rag_pipeline.retriever import global_context_retriever
        results = await global_context_retriever.retrieve_context(
            query=query.get("文本", ""),
            collection_name=query.get("集合", "test_case_knowledge"),
            limit=query.get("限制", 5),
        )
        return {"状态": "ok", "结果": results}
    except Exception as e:
        return {"状态": "error", "消息": str(e)}


@app.post("/api/v1/agents/dispatch", tags=["AI-Native"])
async def dispatch_execution(request: dict):
    """调度智能体执行测试任务"""
    try:
        from app.agents.dispatch_controller import DispatchController
        controller = DispatchController()
        result = await controller.execute({
            "项目ID": request.get("项目ID"),
            "项目名称": request.get("项目名称", ""),
            "需求文档": request.get("需求文档", ""),
            "执行模式": request.get("执行模式", "全流程"),
        })
        return {"状态": "ok", "结果": result}
    except Exception as e:
        return {"状态": "error", "消息": str(e)}


@app.post("/api/v1/agents/debate", tags=["AI-Native"])
async def start_debate(request: dict):
    """启动 AI 多模型辩论"""
    try:
        from app.agents.debate_engine import DebateEngine
        engine = DebateEngine()
        result = await engine.execute({
            "议题": request.get("议题", ""),
            "论点列表": request.get("论点列表", []),
            "最大轮次": request.get("最大轮次", 3),
        })
        return {"状态": "ok", "结果": result}
    except Exception as e:
        return {"状态": "error", "消息": str(e)}


@app.post("/api/v1/agents/execute-single", tags=["AI-Native"])
async def execute_single_agent(request: dict):
    """执行单个智能体"""
    try:
        agent_name = request.get("智能体", "")
        agent_input = request.get("输入", {})

        agent_mapping = {
            "需求分析": "RequirementsAnalyst",
            "测试架构": "TestArchitect",
            "测试设计": "TestDesigner",
            "用例编写": "TestCaseWriter",
            "执行分析": "ExecutionAnalyst",
            "质量审计": "QualityAuditor",
            "成本优化": "CostOptimizer",
        }

        import importlib
        class_name = agent_mapping.get(agent_name)
        if not class_name:
            return {"状态": "error", "消息": f"未知智能体: {agent_name}"}

        module = importlib.import_module(f"app.agents.{class_name.lower()}")
        agent_class = getattr(module, class_name, None)
        if not agent_class:
            return {"状态": "error", "消息": f"未找到类: {class_name}"}

        instance = agent_class()
        result = await instance.execute(agent_input)
        return {"状态": "ok", "结果": result}
    except Exception as e:
        return {"状态": "error", "消息": str(e)}
