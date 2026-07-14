"""
MCP 工具集成 — AI-Native 第三支柱。基于 Model Context Protocol 的标准化工具调用接口。
"""

from .client import ToolClient
from .tool_registry import ToolRegistry, global_tool_registry
from .server import MCPServer

__all__ = [
    "ToolClient",
    "ToolRegistry",
    "global_tool_registry",
    "MCPServer",
]
