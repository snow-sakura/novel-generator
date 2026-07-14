"""设置路由 — 系统配置键值对的 CRUD 操作"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.setting import Setting
from app.schemas.setting import SettingCreate, SettingResponse, SettingUpdate
from app.utils.rbac import 操作, 检查权限

router = APIRouter(prefix="/api/v1/settings", tags=["系统设置"])


@router.get("", response_model=list[SettingResponse])
async def list_settings(
    key: str | None = Query(None, description="按键名筛选"),
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.读取)),
):
    """获取所有系统设置"""
    query = select(Setting)
    if key:
        query = query.where(Setting.key.like(f"%{key}%"))
    query = query.order_by(Setting.key)
    result = await db.execute(query)
    items = list(result.scalars().all())
    return [SettingResponse.model_validate(s) for s in items]


@router.get("/{setting_key}", response_model=SettingResponse)
async def get_setting(
    setting_key: str,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.读取)),
):
    """获取指定设置"""
    result = await db.execute(select(Setting).where(Setting.key == setting_key))
    setting = result.scalar_one_or_none()
    if not setting:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="设置不存在")
    return setting


@router.post("", response_model=SettingResponse, status_code=status.HTTP_201_CREATED)
async def create_setting(
    data: SettingCreate,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.创建)),
):
    """创建设置"""
    # 检查键名是否已存在
    result = await db.execute(select(Setting).where(Setting.key == data.key))
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"设置 '{data.key}' 已存在",
        )

    setting = Setting(key=data.key, value=data.value, description=data.description)
    db.add(setting)
    await db.commit()
    await db.refresh(setting)
    return setting


@router.put("/{setting_key}", response_model=SettingResponse)
async def update_setting(
    setting_key: str,
    data: SettingUpdate,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.更新)),
):
    """更新设置"""
    result = await db.execute(select(Setting).where(Setting.key == setting_key))
    setting = result.scalar_one_or_none()
    if not setting:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="设置不存在")

    setting.value = data.value
    if data.description is not None:
        setting.description = data.description

    await db.commit()
    await db.refresh(setting)
    return setting


@router.delete("/{setting_key}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_setting(
    setting_key: str,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.删除)),
):
    """删除设置"""
    result = await db.execute(select(Setting).where(Setting.key == setting_key))
    setting = result.scalar_one_or_none()
    if not setting:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="设置不存在")

    await db.delete(setting)
    await db.commit()
