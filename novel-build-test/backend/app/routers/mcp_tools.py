"""MCP 工具路由 — 通过主 API 服务器暴露 MCP 工具

4.1.3: 提供统一的工具列表查询和工具调用接口，
将请求委派给全局 ToolRegistry 执行。
"""

import logging

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.mcp_integration.tool_registry import global_tool_registry

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/mcp", tags=["MCP 工具"])


class ExecuteRequest(BaseModel):
    """工具执行请求"""
    arguments: dict = {}


@router.get("/tools", summary="列出可用 MCP 工具")
async def list_mcp_tools():
    """4.1.3: 返回所有已注册的 MCP 工具列表（含名称、描述、参数 Schema）"""
    tools = global_tool_registry.list_tools()
    return {
        "total": len(tools),
        "tools": tools,
    }


@router.post("/tools/{tool_name}/execute", summary="执行指定 MCP 工具")
async def execute_mcp_tool(tool_name: str, request: ExecuteRequest):
    """4.1.3: 按名称查找工具并执行，返回执行结果"""
    tool_func = global_tool_registry.get_tool(tool_name)
    if tool_func is None:
        raise HTTPException(
            status_code=404,
            detail=f"工具 '{tool_name}' 不存在。可用工具: {[t['name'] for t in global_tool_registry.list_tools()]}",
        )

    try:
        logger.info(f"执行 MCP 工具: {tool_name}, 参数: {request.arguments}")
        result = await tool_func(**request.arguments)
        return {
            "success": True,
            "tool": tool_name,
            "result": result,
        }
    except Exception as e:
        logger.exception(f"MCP 工具执行失败: {tool_name}")
        return {
            "success": False,
            "tool": tool_name,
            "error": str(e),
        }
