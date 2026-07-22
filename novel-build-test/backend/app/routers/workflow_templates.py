"""工作流模板路由 — 模板 CRUD、步骤编排与配置管理"""

import math

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.workflow_template import WorkflowTemplate
from app.schemas.workflow_template import (
    WorkflowConfigUpdate,
    WorkflowStepUpdate,
    WorkflowTemplateCreate,
    WorkflowTemplatePage,
    WorkflowTemplateResponse,
    WorkflowTemplateUpdate,
)
from app.utils.rbac import 操作, 检查权限

router = APIRouter(prefix="/api/v1", tags=["工作流配置"])


@router.get("/workflow-templates", response_model=WorkflowTemplatePage)
async def list_workflow_templates(
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页数量"),
    search: str | None = Query(None, description="按模板名称搜索"),
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.读取)),
):
    """获取工作流模板列表（分页，支持名称搜索）"""
    user_id = 当前用户["用户ID"]
    query = select(WorkflowTemplate).where(WorkflowTemplate.created_by == user_id)
    count_query = select(func.count()).select_from(WorkflowTemplate).where(WorkflowTemplate.created_by == user_id)

    if search:
        like_pattern = f"%{search}%"
        query = query.where(WorkflowTemplate.name.like(like_pattern))
        count_query = count_query.where(WorkflowTemplate.name.like(like_pattern))

    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    query = query.order_by(WorkflowTemplate.created_at.desc())
    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    items = list(result.scalars().all())

    return WorkflowTemplatePage(
        items=[WorkflowTemplateResponse.model_validate(r) for r in items],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=math.ceil(total / page_size) if total > 0 else 0,
    )


@router.post(
    "/workflow-templates",
    response_model=WorkflowTemplateResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_workflow_template(
    req_data: WorkflowTemplateCreate,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.创建)),
):
    """创建新工作流模板"""
    user_id = 当前用户["用户ID"]
    template = WorkflowTemplate(
        name=req_data.name,
        description=req_data.description,
        steps=req_data.steps,
        config=req_data.config,
        created_by=user_id,
    )
    db.add(template)
    await db.commit()
    await db.refresh(template)
    return template


@router.get("/workflow-templates/{template_id}", response_model=WorkflowTemplateResponse)
async def get_workflow_template(
    template_id: int,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.读取)),
):
    """获取工作流模板详情"""
    user_id = 当前用户["用户ID"]
    result = await db.execute(
        select(WorkflowTemplate).where(
            WorkflowTemplate.id == template_id,
            WorkflowTemplate.created_by == user_id,
        )
    )
    template = result.scalar_one_or_none()
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="工作流模板不存在",
        )
    return template


@router.put("/workflow-templates/{template_id}", response_model=WorkflowTemplateResponse)
async def update_workflow_template(
    template_id: int,
    req_data: WorkflowTemplateUpdate,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.更新)),
):
    """更新工作流模板信息"""
    user_id = 当前用户["用户ID"]
    result = await db.execute(
        select(WorkflowTemplate).where(
            WorkflowTemplate.id == template_id,
            WorkflowTemplate.created_by == user_id,
        )
    )
    template = result.scalar_one_or_none()
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="工作流模板不存在",
        )

    update_data = req_data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(template, key, value)

    await db.commit()
    await db.refresh(template)
    return template


@router.delete(
    "/workflow-templates/{template_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_workflow_template(
    template_id: int,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.删除)),
):
    """删除工作流模板"""
    user_id = 当前用户["用户ID"]
    result = await db.execute(
        select(WorkflowTemplate).where(
            WorkflowTemplate.id == template_id,
            WorkflowTemplate.created_by == user_id,
        )
    )
    template = result.scalar_one_or_none()
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="工作流模板不存在",
        )

    await db.delete(template)
    await db.commit()


@router.put(
    "/workflow-templates/{template_id}/steps",
    response_model=WorkflowTemplateResponse,
)
async def update_workflow_template_steps(
    template_id: int,
    req_data: WorkflowStepUpdate,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.更新)),
):
    """更新工作流模板的步骤编排"""
    user_id = 当前用户["用户ID"]
    result = await db.execute(
        select(WorkflowTemplate).where(
            WorkflowTemplate.id == template_id,
            WorkflowTemplate.created_by == user_id,
        )
    )
    template = result.scalar_one_or_none()
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="工作流模板不存在",
        )

    template.steps = req_data.steps
    await db.commit()
    await db.refresh(template)
    return template


@router.put(
    "/workflow-templates/{template_id}/config",
    response_model=WorkflowTemplateResponse,
)
async def update_workflow_template_config(
    template_id: int,
    req_data: WorkflowConfigUpdate,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.更新)),
):
    """更新工作流模板的配置（超时/重试/断点策略）"""
    user_id = 当前用户["用户ID"]
    result = await db.execute(
        select(WorkflowTemplate).where(
            WorkflowTemplate.id == template_id,
            WorkflowTemplate.created_by == user_id,
        )
    )
    template = result.scalar_one_or_none()
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="工作流模板不存在",
        )

    template.config = req_data.config
    await db.commit()
    await db.refresh(template)
    return template
