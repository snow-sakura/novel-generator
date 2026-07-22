"""资产路由 — 测试资产的 CRUD 操作（含标签搜索）"""

import math

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.asset import TestAsset
from app.schemas.asset import AssetCreate, AssetPage, AssetResponse, AssetUpdate
from app.utils.rbac import 操作, 检查权限

router = APIRouter(prefix="/api/v1/assets", tags=["测试资产"])


@router.get("", response_model=AssetPage)
async def list_assets(
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页数量"),
    project_id: int | None = Query(None, description="按项目筛选"),
    type: str | None = Query(None, description="按类型筛选"),
    tags: str | None = Query(None, description="按标签筛选（逗号分隔，取交集）"),
    search: str | None = Query(None, description="按名称搜索"),
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.读取)),
):
    """获取资产列表（分页，支持多条件筛选和标签搜索）"""
    user_id = 当前用户["用户ID"]
    query = select(TestAsset).where(TestAsset.created_by == user_id)
    count_query = select(func.count()).select_from(TestAsset).where(TestAsset.created_by == user_id)

    if project_id:
        query = query.where(TestAsset.project_id == project_id)
        count_query = count_query.where(TestAsset.project_id == project_id)
    if type:
        query = query.where(TestAsset.type == type)
        count_query = count_query.where(TestAsset.type == type)
    if tags:
        # 多标签取交集：资产标签需包含所有搜索标签
        for raw_tag in tags.split(","):
            t = raw_tag.strip()
            if t:
                query = query.where(TestAsset.tags.like(f"%{t}%"))
                count_query = count_query.where(TestAsset.tags.like(f"%{t}%"))
    if search:
        like_pattern = f"%{search}%"
        query = query.where(TestAsset.name.like(like_pattern))
        count_query = count_query.where(TestAsset.name.like(like_pattern))

    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    query = query.order_by(TestAsset.updated_at.desc())
    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    items = list(result.scalars().all())

    return AssetPage(
        items=[AssetResponse.model_validate(a) for a in items],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=math.ceil(total / page_size) if total > 0 else 0,
    )


@router.post("", response_model=AssetResponse, status_code=status.HTTP_201_CREATED)
async def create_asset(
    asset_data: AssetCreate,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.创建)),
):
    """创建新资产"""
    user_id = 当前用户["用户ID"]
    asset = TestAsset(
        project_id=asset_data.project_id,
        name=asset_data.name,
        type=asset_data.type,
        tags=asset_data.tags,
        content=asset_data.content,
        created_by=user_id,
    )
    db.add(asset)
    await db.commit()
    await db.refresh(asset)
    return asset


@router.get("/{asset_id}", response_model=AssetResponse)
async def get_asset(
    asset_id: int,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.读取)),
):
    """获取资产详情"""
    user_id = 当前用户["用户ID"]
    result = await db.execute(select(TestAsset).where(TestAsset.id == asset_id, TestAsset.created_by == user_id))
    asset = result.scalar_one_or_none()
    if not asset:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="资产不存在")
    return asset


@router.put("/{asset_id}", response_model=AssetResponse)
async def update_asset(
    asset_id: int,
    asset_data: AssetUpdate,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.更新)),
):
    """更新资产信息"""
    user_id = 当前用户["用户ID"]
    result = await db.execute(select(TestAsset).where(TestAsset.id == asset_id, TestAsset.created_by == user_id))
    asset = result.scalar_one_or_none()
    if not asset:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="资产不存在")

    update_data = asset_data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(asset, key, value)

    # 更新版本号
    asset.version += 1
    await db.commit()
    await db.refresh(asset)
    return asset


@router.delete("/{asset_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_asset(
    asset_id: int,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.删除)),
):
    """删除资产"""
    user_id = 当前用户["用户ID"]
    result = await db.execute(select(TestAsset).where(TestAsset.id == asset_id, TestAsset.created_by == user_id))
    asset = result.scalar_one_or_none()
    if not asset:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="资产不存在")

    await db.delete(asset)
    await db.commit()
