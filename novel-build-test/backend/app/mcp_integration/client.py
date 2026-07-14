"""
MCP 工具客户端封装。
通过 HTTP 与远程 MCP Server 通信，提供工具调用、列表查询和健康检查接口。
"""

import logging
import json
from typing import Any, Optional

import httpx


class ToolClient:
    """MCP 工具客户端，封装对远端 MCP Server 的 HTTP 请求。"""

    def __init__(self, server_url: str = "http://localhost:8001/mcp") -> None:
        """
        初始化客户端。

        Args:
            server_url: MCP Server 的基础 URL，默认为 http://localhost:8001/mcp
        """
        self.server_url = server_url.rstrip("/")
        self.logger = logging.getLogger(self.__class__.__name__)

    async def call_tool(self, tool_name: str, arguments: dict) -> dict:
        """
        调用指定工具。

        Args:
            tool_name: 工具名称
            arguments: 工具参数字典

        Returns:
            工具执行结果的 JSON 响应

        Raises:
            httpx.HTTPError: 当请求失败时抛出
        """
        url = f"{self.server_url}/tools/{tool_name}"
        self.logger.info("调用工具: %s, 参数: %s", tool_name, arguments)

        async with httpx.AsyncClient(timeout=60.0) as client:
            try:
                response = await client.post(url, json=arguments)
                response.raise_for_status()
                result = response.json()
                self.logger.debug("工具 %s 返回: %s", tool_name, result)
                return result
            except httpx.HTTPError as e:
                self.logger.error("调用工具 %s 失败: %s", tool_name, str(e))
                raise

    async def list_tools(self) -> list[dict]:
        """
        获取服务端可用工具列表。

        Returns:
            工具描述信息列表，每个元素包含 name、description、schema 等字段
        """
        url = f"{self.server_url}/tools"
        self.logger.info("获取工具列表: %s", url)

        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                response = await client.get(url)
                response.raise_for_status()
                result = response.json()
                self.logger.debug("工具列表返回 %d 个工具", len(result))
                return result
            except httpx.HTTPError as e:
                self.logger.error("获取工具列表失败: %s", str(e))
                raise

    async def health_check(self) -> bool:
        """
        检查 MCP Server 健康状态。

        Returns:
            服务可用返回 True，否则返回 False
        """
        url = f"{self.server_url}/health"
        self.logger.debug("健康检查: %s", url)

        async with httpx.AsyncClient(timeout=10.0) as client:
            try:
                response = await client.get(url)
                return response.status_code == 200
            except httpx.HTTPError as e:
                self.logger.warning("健康检查失败: %s", str(e))
                return False
