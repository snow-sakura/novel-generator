"""数据库引擎与会话管理"""

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.config import settings

# 异步引擎
engine = create_async_engine(settings.database_url, echo=settings.debug)

# 异步会话工厂
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    """SQLAlchemy 声明式基类"""
    pass


async def get_db():
    """FastAPI 依赖：获取数据库会话"""
    async with async_session() as session:
        try:
            yield session
        finally:
            await session.close()


async def init_db():
    """初始化数据库（自动建表）"""
    async with engine.begin() as conn:
        # 延迟导入模型以触发注册
        from app.models import user, project, audit_log, agent  # noqa: F401
        await conn.run_sync(Base.metadata.create_all)
