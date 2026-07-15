"""pytest 共享配置 — 4.3: 集成测试

提供测试用 AsyncClient、测试数据库 Session 等 fixture。
"""

import asyncio
import pytest
from typing import AsyncGenerator

from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.fixture(scope="session")
def event_loop():
    """创建事件循环（session 级别，避免 ScopeMismatch）"""
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest.fixture
async def client() -> AsyncGenerator[AsyncClient, None]:
    """FastAPI 测试客户端（使用 ASGI 直连，无需真实 HTTP）"""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.fixture
def auth_headers() -> dict:
    """模拟认证头（测试环境下跳过真实 JWT 校验）"""
    return {
        "Authorization": "Bearer test-token",
        "Content-Type": "application/json",
    }
