"""
MCP Server — 基于 FastAPI 的 Model Context Protocol 服务端实现。
提供工具列表查询、工具执行和健康检查的 HTTP 接口。

注意：在生产环境中，MCP Server 应作为独立进程运行以实现更好的隔离性和可扩展性。
"""

import logging
import json
from typing import Any, Optional

import uvicorn
from fastapi import FastAPI, APIRouter, HTTPException
from pydantic import BaseModel
from app.config import settings

from .tool_registry import global_tool_registry


class ExecuteRequest(BaseModel):
    """工具执行请求体模型。"""
    arguments: dict = {}


class MCPServer:
    """
    MCP Server 封装，提供标准的工具调用 HTTP 接口。
    基于 FastAPI 构建，支持异步工具执行。
    """

    def __init__(self, host: str = "0.0.0.0", port: int = 8001) -> None:
        """
        初始化 MCP Server。

        Args:
            host: 监听地址，默认为 0.0.0.0
            port: 监听端口，默认为 8001
        """
        self.host = host
        self.port = port
        self.logger = logging.getLogger(self.__class__.__name__)
        self._app: Optional[FastAPI] = None
        self._server: Optional[uvicorn.Server] = None

        # 初始化 FastAPI 应用并注册路由
        self._build_app()

    def _build_app(self) -> None:
        """构建 FastAPI 应用，注册各路由处理器。"""
        self._app = FastAPI(
            title="MCP Tool Server",
            description="基于 Model Context Protocol 的标准化工具调用服务",
            version="1.0.0",
        )

        router = APIRouter(prefix="/mcp")

        @router.get("/tools", summary="获取工具列表")
        async def list_tools() -> list[dict]:
            """
            返回当前注册的所有工具元信息。
            """
            tools = global_tool_registry.list_tools()
            self.logger.debug("列出 %d 个工具", len(tools))
            return tools

        @router.post("/tools/{tool_name}", summary="执行指定工具")
        async def execute_tool(tool_name: str, request: ExecuteRequest) -> Any:
            """
            根据工具名称查找已注册的工具并执行。

            Args:
                tool_name: 要执行的工具名称
                request: 包含参数字典的请求体

            Returns:
                工具执行结果

            Raises:
                HTTPException 404: 工具不存在
                HTTPException 500: 执行异常
            """
            tool_func = global_tool_registry.get_tool(tool_name)
            if tool_func is None:
                self.logger.warning("请求执行不存在的工具: %s", tool_name)
                raise HTTPException(status_code=404, detail=f"工具 '{tool_name}' 不存在")

            try:
                self.logger.info("执行工具: %s", tool_name)
                result = await tool_func(**request.arguments)
                return {"result": result}
            except Exception as e:
                self.logger.exception("工具 %s 执行失败: %s", tool_name, str(e))
                raise HTTPException(status_code=500, detail=str(e))

        @router.get("/health", summary="健康检查")
        async def health_check() -> dict:
            """
            返回服务健康状态。
            """
            return {"status": "healthy", "tools_count": len(global_tool_registry.list_tools())}

        self._app.include_router(router)

    @property
    def app(self) -> FastAPI:
        """获取底层 FastAPI 应用实例。"""
        if self._app is None:
            self._build_app()
        return self._app

    async def start(self) -> None:
        """
        启动 MCP Server（基于 uvicorn）。

        在生产环境中，此服务应作为独立进程运行，
        可通过 systemd / supervisor / Docker 等方式管理。
        """
        self.logger.info("启动 MCP Server: %s:%s", self.host, self.port)

        config = uvicorn.Config(
            app=self._app,
            host=self.host,
            port=self.port,
            log_level="info",
        )
        self._server = uvicorn.Server(config)

        # 在 asyncio 事件循环中运行 uvicorn
        await self._server.serve()

    async def stop(self) -> None:
        """
        优雅停止 MCP Server。
        """
        self.logger.info("停止 MCP Server: %s:%s", self.host, self.port)

        if self._server is not None:
            self._server.should_exit = True
            self._server = None
