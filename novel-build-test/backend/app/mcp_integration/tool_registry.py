"""
工具注册中心 — 统一管理所有 MCP 可调用工具的定义、注册与执行。
提供注册、注销、查询和动态调用能力。
"""

import logging
from collections.abc import Callable
from typing import Any


class ToolRegistry:
    """MCP 工具注册中心，管理工具的生命周期和动态调用。"""

    def __init__(self) -> None:
        """初始化空的工具注册表。"""
        self._tools: dict[str, dict] = {}
        self.logger = logging.getLogger(self.__class__.__name__)

    def register(
        self,
        name: str,
        func: Callable,
        description: str = "",
        schema: dict | None = None,
    ) -> None:
        """
        注册一个工具。

        Args:
            name: 工具名称（唯一标识）
            func: 工具的可调用实现
            description: 工具描述文本
            schema: 工具参数的 JSON Schema（可选）
        """
        if name in self._tools:
            self.logger.warning("工具 '%s' 已存在，将被覆盖", name)

        self._tools[name] = {
            "name": name,
            "func": func,
            "description": description,
            "schema": schema or {},
        }
        self.logger.info("注册工具: %s", name)

    def unregister(self, name: str) -> None:
        """
        注销指定工具。

        Args:
            name: 要移除的工具名称

        Raises:
            KeyError: 工具不存在时抛出
        """
        if name not in self._tools:
            self.logger.error("工具 '%s' 不存在，无法注销", name)
            raise KeyError(f"工具 '{name}' 未注册")

        del self._tools[name]
        self.logger.info("注销工具: %s", name)

    def get_tool(self, name: str) -> Callable | None:
        """
        根据名称获取工具的可调用对象。

        Args:
            name: 工具名称

        Returns:
            工具的可调用对象，如果不存在则返回 None
        """
        tool = self._tools.get(name)
        if tool is None:
            self.logger.warning("工具 '%s' 未找到", name)
            return None
        return tool["func"]

    def list_tools(self) -> list[dict]:
        """
        列出所有已注册的工具元信息。

        Returns:
            工具描述列表，每项包含 name、description、schema
        """
        return [
            {
                "name": info["name"],
                "description": info["description"],
                "schema": info["schema"],
            }
            for info in self._tools.values()
        ]

    async def execute_tool(self, name: str, arguments: dict) -> Any:
        """
        执行指定名称的工具。

        Args:
            name: 工具名称
            arguments: 传递给工具的参数

        Returns:
            工具执行结果

        Raises:
            KeyError: 工具未注册时抛出
            Exception: 工具执行异常时向上传播
        """
        tool = self._tools.get(name)
        if tool is None:
            self.logger.error("尝试执行未注册的工具: %s", name)
            raise KeyError(f"工具 '{name}' 未注册")

        func = tool["func"]
        self.logger.info("执行工具: %s, 参数: %s", name, arguments)

        try:
            if hasattr(func, "__code__") and "logger" in func.__code__.co_varnames:
                result = await func(**arguments, logger=self.logger)
            else:
                result = await func(**arguments)
            self.logger.debug("工具 %s 执行成功: %s", name, result)
            return result
        except Exception as e:
            self.logger.exception("工具 %s 执行异常: %s", name, str(e))
            raise


# 全局共享的工具注册中心单例
global_tool_registry = ToolRegistry()
