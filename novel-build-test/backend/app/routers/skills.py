"""Skills 路由 — 技能注册、MCP 工具、权限分配、市场与调用日志

⚠️ 注意：静态路由（/market, /mcp, /permissions, /logs）必须定义在
   参数化路由 /{skill_id} 之前，否则会被 skill_id 匹配拦截。
"""

import logging
import random

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.skill import McpTool, Skill, SkillLog, SkillPermission
from app.schemas.base import Page, page_from_query
from app.schemas.phase3 import (
    McpToolCreate,
    McpToolResponse,
    McpToolUpdate,
    SkillCreate,
    SkillLogResponse,
    SkillPermissionResponse,
    SkillPermissionUpdate,
    SkillResponse,
    SkillUpdate,
)
from app.utils.rbac import 操作, 检查权限

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/skills", tags=["技能中心"])

# ===================================================================
#  Skills CRUD (no path params)
# ===================================================================


@router.get("", response_model=Page[SkillResponse])
async def list_skills(
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页条数"),
    skill_type: str | None = Query(None, description="技能类型: mcp/internal/custom"),
    search: str | None = Query(None, description="按名称搜索"),
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.读取)),
):
    """获取技能列表（分页），支持按类型和名称搜索"""
    try:
        query = select(Skill)
        count_query = select(func.count()).select_from(Skill)

        if skill_type:
            query = query.where(Skill.skill_type == skill_type)
            count_query = count_query.where(Skill.skill_type == skill_type)
        if search:
            like_pattern = f"%{search}%"
            query = query.where(Skill.name.ilike(like_pattern))
            count_query = count_query.where(Skill.name.ilike(like_pattern))

        total_result = await db.execute(count_query)
        total = total_result.scalar() or 0

        query = query.order_by(Skill.id).offset((page - 1) * page_size).limit(page_size)
        result = await db.execute(query)
        items = list(result.scalars().all())

        return page_from_query(SkillResponse, items, total, page, page_size)
    except Exception:
        logger.exception("查询技能列表失败")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="查询失败")


@router.post("", response_model=SkillResponse, status_code=status.HTTP_201_CREATED)
async def create_skill(
    skill_data: SkillCreate,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.创建)),
):
    """创建技能"""
    try:
        skill = Skill(
            name=skill_data.name,
            skill_type=skill_data.skill_type,
            description=skill_data.description,
            config=skill_data.config,
        )
        db.add(skill)
        await db.commit()
        await db.refresh(skill)
        return skill
    except Exception:
        logger.exception("创建技能失败")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="创建失败")


# ===================================================================
#  Market — 技能市场（预设包） — 静态路由，必须在 /{skill_id} 之前
# ===================================================================

# 预置技能包
_PRESET_SKILL_PACKAGES = [
    {
        "id": "code-review",
        "name": "代码审查技能包",
        "description": "包含代码审查相关的 MCP 工具和规则",
        "skills": [
            {"name": "代码审查助手", "skill_type": "mcp", "description": "自动审查代码质量", "config": "{}"},
            {"name": "安全扫描器", "skill_type": "mcp", "description": "检测代码安全漏洞", "config": "{}"},
        ],
    },
    {
        "id": "docs-generator",
        "name": "文档生成技能包",
        "description": "自动生成项目文档和 API 文档",
        "skills": [
            {"name": "文档生成器", "skill_type": "internal", "description": "根据代码生成文档", "config": "{}"},
            {"name": "API 文档工具", "skill_type": "mcp", "description": "解析 OpenAPI 生成文档", "config": "{}"},
        ],
    },
    {
        "id": "data-analyst",
        "name": "数据分析技能包",
        "description": "数据分析与可视化工具集",
        "skills": [
            {"name": "数据查询器", "skill_type": "mcp", "description": "执行 SQL 查询", "config": "{}"},
            {"name": "图表生成器", "skill_type": "custom", "description": "生成数据可视化图表", "config": "{}"},
        ],
    },
]


@router.get("/market")
async def list_skill_market(
    当前用户: dict = Depends(检查权限(操作.读取)),
):
    """获取技能市场预置包列表（硬编码）"""
    return {"items": _PRESET_SKILL_PACKAGES}


@router.post("/market/{package_id}/enable")
async def enable_skill_package(
    package_id: str,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.创建)),
):
    """启用预置技能包 — 从预设创建技能记录"""
    try:
        package = next((p for p in _PRESET_SKILL_PACKAGES if p["id"] == package_id), None)
        if not package:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="技能包不存在")

        created = []
        for skill_def in package["skills"]:
            # 避免重复创建同名技能
            existing = await db.execute(
                select(Skill).where(Skill.name == skill_def["name"])
            )
            if existing.scalar_one_or_none():
                continue

            skill = Skill(
                name=skill_def["name"],
                skill_type=skill_def["skill_type"],
                description=skill_def.get("description"),
                config=skill_def.get("config", "{}"),
            )
            db.add(skill)
            created.append(skill_def["name"])

        await db.commit()

        return {
            "message": f"技能包 '{package['name']}' 已启用",
            "created": created,
        }
    except HTTPException:
        raise
    except Exception:
        logger.exception("启用技能包失败")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="启用失败")


# ===================================================================
#  MCP Tools CRUD — 静态前缀 /mcp，必须在 /{skill_id} 之前
# ===================================================================


@router.get("/mcp", response_model=Page[McpToolResponse])
async def list_mcp_tools(
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页条数"),
    search: str | None = Query(None, description="按名称搜索"),
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.读取)),
):
    """获取 MCP 工具列表（分页），支持按名称搜索"""
    try:
        query = select(McpTool)
        count_query = select(func.count()).select_from(McpTool)

        if search:
            like_pattern = f"%{search}%"
            query = query.where(McpTool.name.ilike(like_pattern))
            count_query = count_query.where(McpTool.name.ilike(like_pattern))

        total_result = await db.execute(count_query)
        total = total_result.scalar() or 0

        query = query.order_by(McpTool.id).offset((page - 1) * page_size).limit(page_size)
        result = await db.execute(query)
        items = list(result.scalars().all())

        return page_from_query(McpToolResponse, items, total, page, page_size)
    except Exception:
        logger.exception("查询 MCP 工具列表失败")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="查询失败")


@router.post("/mcp", response_model=McpToolResponse, status_code=status.HTTP_201_CREATED)
async def create_mcp_tool(
    tool_data: McpToolCreate,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.创建)),
):
    """创建 MCP 工具"""
    try:
        # 检查名称是否已存在
        existing = await db.execute(select(McpTool).where(McpTool.name == tool_data.name))
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="工具名称已存在")

        tool = McpTool(
            name=tool_data.name,
            description=tool_data.description,
            schema_def=tool_data.schema_def,
            endpoint=tool_data.endpoint,
        )
        db.add(tool)
        await db.commit()
        await db.refresh(tool)
        return tool
    except HTTPException:
        raise
    except Exception:
        logger.exception("创建 MCP 工具失败")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="创建失败")


@router.put("/mcp/{tool_id}", response_model=McpToolResponse)
async def update_mcp_tool(
    tool_id: int,
    tool_data: McpToolUpdate,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.更新)),
):
    """更新 MCP 工具"""
    try:
        result = await db.execute(select(McpTool).where(McpTool.id == tool_id))
        tool = result.scalar_one_or_none()
        if not tool:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="工具不存在")

        update_data = tool_data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(tool, key, value)

        await db.commit()
        await db.refresh(tool)
        return tool
    except HTTPException:
        raise
    except Exception:
        logger.exception("更新 MCP 工具失败")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="更新失败")


@router.delete("/mcp/{tool_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_mcp_tool(
    tool_id: int,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.删除)),
):
    """删除 MCP 工具"""
    try:
        result = await db.execute(select(McpTool).where(McpTool.id == tool_id))
        tool = result.scalar_one_or_none()
        if not tool:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="工具不存在")

        await db.delete(tool)
        await db.commit()
    except HTTPException:
        raise
    except Exception:
        logger.exception("删除 MCP 工具失败")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="删除失败")


# ===================================================================
#  Skill Permissions — 技能权限分配 — 静态前缀 /permissions
# ===================================================================


@router.get("/permissions", response_model=Page[SkillPermissionResponse])
async def list_skill_permissions(
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页条数"),
    agent_key: str | None = Query(None, description="按 Agent 标识筛选"),
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.读取)),
):
    """获取技能权限分配列表（分页），支持按 Agent 筛选"""
    try:
        query = select(SkillPermission)
        count_query = select(func.count()).select_from(SkillPermission)

        if agent_key:
            query = query.where(SkillPermission.agent_key == agent_key)
            count_query = count_query.where(SkillPermission.agent_key == agent_key)

        total_result = await db.execute(count_query)
        total = total_result.scalar() or 0

        query = query.order_by(SkillPermission.id).offset((page - 1) * page_size).limit(page_size)
        result = await db.execute(query)
        items = list(result.scalars().all())

        return page_from_query(SkillPermissionResponse, items, total, page, page_size)
    except Exception:
        logger.exception("查询技能权限列表失败")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="查询失败")


@router.post("/permissions", response_model=SkillPermissionResponse, status_code=status.HTTP_201_CREATED)
async def create_or_update_skill_permission(
    perm_data: SkillPermissionUpdate,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.创建)),
):
    """创建或更新技能权限分配（upsert）"""
    try:
        # 检查技能是否存在
        skill_exists = await db.execute(select(Skill).where(Skill.id == perm_data.skill_id))
        if not skill_exists.scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="技能不存在")

        # 查找已有权限记录
        existing = await db.execute(
            select(SkillPermission).where(
                SkillPermission.agent_key == perm_data.agent_key,
                SkillPermission.skill_id == perm_data.skill_id,
            )
        )
        perm = existing.scalar_one_or_none()

        if perm:
            # 更新
            perm.is_enabled = perm_data.is_enabled
        else:
            # 创建
            perm = SkillPermission(
                agent_key=perm_data.agent_key,
                skill_id=perm_data.skill_id,
                is_enabled=perm_data.is_enabled,
            )
            db.add(perm)

        await db.commit()
        await db.refresh(perm)
        return perm
    except HTTPException:
        raise
    except Exception:
        logger.exception("创建/更新技能权限失败")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="操作失败")


@router.delete("/permissions/{perm_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_skill_permission(
    perm_id: int,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.删除)),
):
    """删除技能权限分配"""
    try:
        result = await db.execute(select(SkillPermission).where(SkillPermission.id == perm_id))
        perm = result.scalar_one_or_none()
        if not perm:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="权限记录不存在")

        await db.delete(perm)
        await db.commit()
    except HTTPException:
        raise
    except Exception:
        logger.exception("删除技能权限失败")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="删除失败")


# ===================================================================
#  Skill Logs — 技能调用日志 — 静态前缀 /logs
# ===================================================================


@router.get("/logs", response_model=Page[SkillLogResponse])
async def list_skill_logs(
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页条数"),
    skill_id: int | None = Query(None, description="按技能 ID 筛选"),
    status: str | None = Query(None, description="按状态筛选: success/failed"),
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.读取)),
):
    """获取技能调用日志列表（分页），支持按技能和状态筛选"""
    try:
        query = select(SkillLog)
        count_query = select(func.count()).select_from(SkillLog)

        if skill_id is not None:
            query = query.where(SkillLog.skill_id == skill_id)
            count_query = count_query.where(SkillLog.skill_id == skill_id)
        if status:
            query = query.where(SkillLog.status == status)
            count_query = count_query.where(SkillLog.status == status)

        total_result = await db.execute(count_query)
        total = total_result.scalar() or 0

        query = query.order_by(desc(SkillLog.created_at)).offset((page - 1) * page_size).limit(page_size)
        result = await db.execute(query)
        items = list(result.scalars().all())

        return page_from_query(SkillLogResponse, items, total, page, page_size)
    except Exception:
        logger.exception("查询技能日志失败")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="查询失败")


# ===================================================================
#  Skills — 参数化路由（必须在所有静态路由之后）
# ===================================================================


@router.get("/{skill_id}", response_model=SkillResponse)
async def get_skill(
    skill_id: int,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.读取)),
):
    """获取技能详情"""
    try:
        result = await db.execute(select(Skill).where(Skill.id == skill_id))
        skill = result.scalar_one_or_none()
        if not skill:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="技能不存在")
        return skill
    except HTTPException:
        raise
    except Exception:
        logger.exception("查询技能详情失败")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="查询失败")


@router.put("/{skill_id}", response_model=SkillResponse)
async def update_skill(
    skill_id: int,
    skill_data: SkillUpdate,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.更新)),
):
    """更新技能信息"""
    try:
        result = await db.execute(select(Skill).where(Skill.id == skill_id))
        skill = result.scalar_one_or_none()
        if not skill:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="技能不存在")

        update_data = skill_data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(skill, key, value)

        await db.commit()
        await db.refresh(skill)
        return skill
    except HTTPException:
        raise
    except Exception:
        logger.exception("更新技能失败")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="更新失败")


@router.delete("/{skill_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_skill(
    skill_id: int,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.删除)),
):
    """删除技能"""
    try:
        result = await db.execute(select(Skill).where(Skill.id == skill_id))
        skill = result.scalar_one_or_none()
        if not skill:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="技能不存在")

        await db.delete(skill)
        await db.commit()
    except HTTPException:
        raise
    except Exception:
        logger.exception("删除技能失败")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="删除失败")


@router.post("/{skill_id}/test", response_model=SkillLogResponse)
async def test_skill(
    skill_id: int,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.读取)),
):
    """测试技能 — 模拟调用并创建调用日志"""
    try:
        result = await db.execute(select(Skill).where(Skill.id == skill_id))
        skill = result.scalar_one_or_none()
        if not skill:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="技能不存在")

        # 模拟测试
        duration = random.randint(50, 2000)
        log_entry = SkillLog(
            skill_id=skill_id,
            agent_key=当前用户.get("用户名", "unknown"),
            input_data='{"test": true}',
            output_data='{"result": "ok", "message": "模拟测试通过"}',
            duration_ms=duration,
            status="success",
        )
        db.add(log_entry)
        await db.commit()
        await db.refresh(log_entry)
        return log_entry
    except HTTPException:
        raise
    except Exception:
        logger.exception("测试技能失败")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="测试失败")
