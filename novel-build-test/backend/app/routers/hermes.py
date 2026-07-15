"""Hermes 路由 — 消息通道管理与权限审批"""

import datetime
import logging

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.hermes import HermesChannel, HermesPermission
from app.schemas.base import Page, page_from_query
from app.schemas.phase3 import (
    HermesChannelCreate,
    HermesChannelResponse,
    HermesChannelUpdate,
    HermesPermissionPage,
    HermesPermissionRespond,
    HermesPermissionResponse,
)
from app.utils.rbac import 操作, 检查权限

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/hermes", tags=["Hermes 消息通道"])


# ===================================================================
#  Channels CRUD
# ===================================================================


@router.get("/channels", response_model=Page[HermesChannelResponse])
async def list_hermes_channels(
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页条数"),
    platform: str | None = Query(None, description="平台筛选: telegram/discord/slack/custom"),
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.读取)),
):
    """获取消息通道列表（分页），支持按平台筛选"""
    try:
        query = select(HermesChannel)
        count_query = select(func.count()).select_from(HermesChannel)

        if platform:
            query = query.where(HermesChannel.platform == platform)
            count_query = count_query.where(HermesChannel.platform == platform)

        total_result = await db.execute(count_query)
        total = total_result.scalar() or 0

        query = query.order_by(HermesChannel.id).offset((page - 1) * page_size).limit(page_size)
        result = await db.execute(query)
        items = list(result.scalars().all())

        return page_from_query(HermesChannelResponse, items, total, page, page_size)
    except Exception:
        logger.exception("查询消息通道列表失败")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="查询失败")


@router.post("/channels", response_model=HermesChannelResponse, status_code=status.HTTP_201_CREATED)
async def create_hermes_channel(
    channel_data: HermesChannelCreate,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.创建)),
):
    """创建消息通道"""
    try:
        channel = HermesChannel(
            name=channel_data.name,
            platform=channel_data.platform,
            config=channel_data.config,
        )
        db.add(channel)
        await db.commit()
        await db.refresh(channel)
        return channel
    except Exception:
        logger.exception("创建消息通道失败")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="创建失败")


@router.put("/channels/{channel_id}", response_model=HermesChannelResponse)
async def update_hermes_channel(
    channel_id: int,
    channel_data: HermesChannelUpdate,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.更新)),
):
    """更新消息通道"""
    try:
        result = await db.execute(select(HermesChannel).where(HermesChannel.id == channel_id))
        channel = result.scalar_one_or_none()
        if not channel:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="通道不存在")

        update_data = channel_data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(channel, key, value)

        await db.commit()
        await db.refresh(channel)
        return channel
    except HTTPException:
        raise
    except Exception:
        logger.exception("更新消息通道失败")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="更新失败")


@router.delete("/channels/{channel_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_hermes_channel(
    channel_id: int,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.删除)),
):
    """删除消息通道"""
    try:
        result = await db.execute(select(HermesChannel).where(HermesChannel.id == channel_id))
        channel = result.scalar_one_or_none()
        if not channel:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="通道不存在")

        await db.delete(channel)
        await db.commit()
    except HTTPException:
        raise
    except Exception:
        logger.exception("删除消息通道失败")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="删除失败")


# ===================================================================
#  Permissions — 审批记录
# ===================================================================


@router.get("/permissions", response_model=Page[HermesPermissionResponse])
async def list_hermes_permissions(
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页条数"),
    status: str | None = Query("pending", description="状态筛选: pending/approved/denied"),
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.读取)),
):
    """获取权限审批记录列表（分页），支持按状态筛选"""
    try:
        query = select(HermesPermission)
        count_query = select(func.count()).select_from(HermesPermission)

        if status:
            query = query.where(HermesPermission.status == status)
            count_query = count_query.where(HermesPermission.status == status)

        total_result = await db.execute(count_query)
        total = total_result.scalar() or 0

        query = query.order_by(desc(HermesPermission.created_at)).offset((page - 1) * page_size).limit(page_size)
        result = await db.execute(query)
        items = list(result.scalars().all())

        return page_from_query(HermesPermissionResponse, items, total, page, page_size)
    except Exception:
        logger.exception("查询权限审批记录失败")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="查询失败")


@router.post("/permissions/{perm_id}/respond", response_model=HermesPermissionResponse)
async def respond_hermes_permission(
    perm_id: int,
    body: HermesPermissionRespond,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.更新)),
):
    """审批权限请求（approve / deny）"""
    try:
        result = await db.execute(select(HermesPermission).where(HermesPermission.id == perm_id))
        permission = result.scalar_one_or_none()
        if not permission:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="审批记录不存在")

        if permission.status != "pending":
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="该请求已处理，不能重复审批")

        permission.status = body.decision  # "approve" | "deny"
        permission.responded_by = 当前用户["用户ID"]
        permission.responded_at = datetime.datetime.now(datetime.UTC).isoformat()

        await db.commit()
        await db.refresh(permission)
        return permission
    except HTTPException:
        raise
    except Exception:
        logger.exception("审批权限请求失败")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="审批失败")
