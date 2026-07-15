"""MCP 管理路由 — MCP 工具注册表查询与 DB 管理 CRUD"""

import logging

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.mcp_integration.tool_registry import global_tool_registry
from app.models.skill import McpTool
from app.schemas.base import Page, page_from_query
from app.schemas.phase3 import McpToolCreate, McpToolPage, McpToolResponse, McpToolUpdate
from app.utils.rbac import 操作, 检查权限

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/mcp", tags=["MCP 工具管理"])


@router.get("/tools/registry", summary="列出注册表中所有 MCP 工具")
async def list_registry_tools(
    当前用户: dict = Depends(检查权限(操作.读取)),
):
    """返回内存注册表中所有已注册的 MCP 工具（含名称、描述、参数 Schema）"""
    tools = global_tool_registry.list_tools()
    return {
        "total": len(tools),
        "tools": tools,
    }


@router.get("/tools/managed", response_model=Page[McpToolResponse], summary="列出 DB 管理的 MCP 工具（分页）")
async def list_managed_tools(
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页条数"),
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.读取)),
):
    """获取数据库中管理的 MCP 工具列表（分页）"""
    total = (await db.execute(select(func.count(McpTool.id)))).scalar() or 0

    items = list(
        (
            await db.execute(
                select(McpTool).order_by(McpTool.id).offset((page - 1) * page_size).limit(page_size)
            )
        ).scalars().all()
    )

    return page_from_query(McpToolResponse, items, total, page, page_size)


@router.post(
    "/tools/managed",
    response_model=McpToolResponse,
    status_code=status.HTTP_201_CREATED,
    summary="注册 MCP 工具到 DB",
)
async def create_managed_tool(
    data: McpToolCreate,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.创建)),
):
    """在数据库中注册新的 MCP 工具"""
    # 检查工具名是否已存在
    result = await db.execute(select(McpTool).where(McpTool.name == data.name))
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"MCP 工具 '{data.name}' 已存在",
        )

    tool = McpTool(
        name=data.name,
        description=data.description,
        schema_def=data.schema_def,
        endpoint=data.endpoint,
    )
    db.add(tool)
    await db.commit()
    await db.refresh(tool)
    return tool


@router.put("/tools/managed/{tool_id}", response_model=McpToolResponse, summary="更新 DB 中的 MCP 工具")
async def update_managed_tool(
    tool_id: int,
    data: McpToolUpdate,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.更新)),
):
    """更新数据库中已有的 MCP 工具"""
    result = await db.execute(select(McpTool).where(McpTool.id == tool_id))
    tool = result.scalar_one_or_none()
    if not tool:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="MCP 工具不存在")

    if data.name is not None:
        tool.name = data.name
    if data.description is not None:
        tool.description = data.description
    if data.schema_def is not None:
        tool.schema_def = data.schema_def
    if data.endpoint is not None:
        tool.endpoint = data.endpoint
    if data.is_active is not None:
        tool.is_active = data.is_active

    await db.commit()
    await db.refresh(tool)
    return tool


@router.delete("/tools/managed/{tool_id}", status_code=status.HTTP_204_NO_CONTENT, summary="删除 DB 中的 MCP 工具")
async def delete_managed_tool(
    tool_id: int,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.删除)),
):
    """从数据库中删除 MCP 工具"""
    result = await db.execute(select(McpTool).where(McpTool.id == tool_id))
    tool = result.scalar_one_or_none()
    if not tool:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="MCP 工具不存在")

    await db.delete(tool)
    await db.commit()
