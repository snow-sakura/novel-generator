"""Web 自动化测试路由 — 脚本 CRUD + Mock 执行/结果"""

import math

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.test_modules import WebTestScript
from app.schemas.test_modules import (
    WebScriptCreate,
    WebScriptResponse,
    WebScriptPage,
    WebScriptUpdate,
)
from app.utils.rbac import 操作, 检查权限

router = APIRouter(prefix="/api/v1/test-web", tags=["Web自动化测试"])


@router.get("/scripts", response_model=WebScriptPage)
async def list_web_scripts(
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页数量"),
    project_id: int | None = Query(None, description="按项目筛选"),
    search: str | None = Query(None, description="按名称搜索"),
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.读取)),
):
    """获取 Web 自动化脚本列表（分页，支持筛选和搜索）"""
    user_id = 当前用户["用户ID"]
    query = select(WebTestScript).where(WebTestScript.created_by == user_id)
    count_query = (
        select(func.count())
        .select_from(WebTestScript)
        .where(WebTestScript.created_by == user_id)
    )

    if project_id:
        query = query.where(WebTestScript.project_id == project_id)
        count_query = count_query.where(WebTestScript.project_id == project_id)
    if search:
        like_pattern = f"%{search}%"
        query = query.where(WebTestScript.name.like(like_pattern))
        count_query = count_query.where(WebTestScript.name.like(like_pattern))

    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    query = query.order_by(WebTestScript.updated_at.desc())
    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    items = list(result.scalars().all())

    return WebScriptPage(
        items=[WebScriptResponse.model_validate(s) for s in items],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=math.ceil(total / page_size) if total > 0 else 0,
    )


@router.get("/scripts/{script_id}", response_model=WebScriptResponse)
async def get_web_script(
    script_id: int,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.读取)),
):
    """获取 Web 自动化脚本详情"""
    user_id = 当前用户["用户ID"]
    result = await db.execute(
        select(WebTestScript).where(
            WebTestScript.id == script_id, WebTestScript.created_by == user_id
        )
    )
    script = result.scalar_one_or_none()
    if not script:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="脚本不存在")
    return script


@router.post("/scripts", response_model=WebScriptResponse, status_code=status.HTTP_201_CREATED)
async def create_web_script(
    script_data: WebScriptCreate,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.创建)),
):
    """创建 Web 自动化脚本"""
    user_id = 当前用户["用户ID"]
    script = WebTestScript(
        project_id=script_data.project_id,
        name=script_data.name,
        description=script_data.description,
        code=script_data.code,
        framework=script_data.framework,
        config=script_data.config,
        created_by=user_id,
    )
    db.add(script)
    await db.commit()
    await db.refresh(script)
    return script


@router.put("/scripts/{script_id}", response_model=WebScriptResponse)
async def update_web_script(
    script_id: int,
    script_data: WebScriptUpdate,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.更新)),
):
    """更新 Web 自动化脚本"""
    user_id = 当前用户["用户ID"]
    result = await db.execute(
        select(WebTestScript).where(
            WebTestScript.id == script_id, WebTestScript.created_by == user_id
        )
    )
    script = result.scalar_one_or_none()
    if not script:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="脚本不存在")

    update_data = script_data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(script, key, value)

    await db.commit()
    await db.refresh(script)
    return script


@router.delete("/scripts/{script_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_web_script(
    script_id: int,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.删除)),
):
    """删除 Web 自动化脚本"""
    user_id = 当前用户["用户ID"]
    result = await db.execute(
        select(WebTestScript).where(
            WebTestScript.id == script_id, WebTestScript.created_by == user_id
        )
    )
    script = result.scalar_one_or_none()
    if not script:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="脚本不存在")

    await db.delete(script)
    await db.commit()


@router.post("/scripts/{script_id}/run", status_code=status.HTTP_200_OK)
async def run_web_script(
    script_id: int,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.创建)),
):
    """Mock 执行 Web 自动化脚本"""
    user_id = 当前用户["用户ID"]
    result = await db.execute(
        select(WebTestScript).where(
            WebTestScript.id == script_id, WebTestScript.created_by == user_id
        )
    )
    script = result.scalar_one_or_none()
    if not script:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="脚本不存在")

    return {
        "script_id": script_id,
        "status": "running",
        "message": f"脚本 '{script.name}' 已提交执行",
    }


@router.get("/scripts/{script_id}/result", status_code=status.HTTP_200_OK)
async def get_web_script_result(
    script_id: int,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.读取)),
):
    """Mock 获取 Web 自动化脚本执行结果"""
    user_id = 当前用户["用户ID"]
    result = await db.execute(
        select(WebTestScript).where(
            WebTestScript.id == script_id, WebTestScript.created_by == user_id
        )
    )
    script = result.scalar_one_or_none()
    if not script:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="脚本不存在")

    return {
        "script_id": script_id,
        "script_name": script.name,
        "status": "completed",
        "passed": True,
        "duration_ms": 2350,
        "message": "Mock 执行结果：测试通过",
    }
