"""pytest 共享配置 — 4.3: 集成测试

提供测试用 AsyncClient 等 fixture。
"""

import pytest_asyncio
from typing import AsyncGenerator

from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest_asyncio.fixture
async def client() -> AsyncGenerator[AsyncClient, None]:
    """FastAPI 测试客户端（使用 ASGI 直连，无需真实 HTTP）"""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
