"""集成路由 — CI/CD 配置、通知渠道、外部工具 CRUD"""

import logging

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.integration import CicdConfig, ExternalTool, NotificationChannel
from app.schemas.base import Page, page_from_query
from app.schemas.phase3 import (
    CicdConfigCreate,
    CicdConfigPage,
    CicdConfigResponse,
    CicdConfigUpdate,
    ExternalToolCreate,
    ExternalToolPage,
    ExternalToolResponse,
    ExternalToolUpdate,
    NotificationChannelCreate,
    NotificationChannelPage,
    NotificationChannelResponse,
    NotificationChannelUpdate,
)
from app.utils.rbac import 操作, 检查权限

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/integration", tags=["集成与通知"])


# ==================== CI/CD 配置 ====================


@router.get("/cicd", response_model=Page[CicdConfigResponse])
async def list_cicd_configs(
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页条数"),
    project_id: int | None = Query(None, description="按项目ID筛选"),
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.读取)),
):
    """获取 CI/CD 配置列表（分页）"""
    query = select(CicdConfig)
    count_query = select(func.count(CicdConfig.id))

    if project_id is not None:
        query = query.where(CicdConfig.project_id == project_id)
        count_query = count_query.where(CicdConfig.project_id == project_id)

    total = (await db.execute(count_query)).scalar() or 0

    items = list(
        (
            await db.execute(
                query.order_by(CicdConfig.id).offset((page - 1) * page_size).limit(page_size)
            )
        ).scalars().all()
    )

    return page_from_query(CicdConfigResponse, items, total, page, page_size)


@router.post("/cicd", response_model=CicdConfigResponse, status_code=status.HTTP_201_CREATED)
async def create_cicd_config(
    data: CicdConfigCreate,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.创建)),
):
    """创建 CI/CD 配置"""
    config = CicdConfig(
        project_id=data.project_id,
        name=data.name,
        ci_type=data.ci_type,
        webhook_url=data.webhook_url,
        secret=data.secret,
        events=data.events,
    )
    db.add(config)
    await db.commit()
    await db.refresh(config)
    return config


@router.put("/cicd/{config_id}", response_model=CicdConfigResponse)
async def update_cicd_config(
    config_id: int,
    data: CicdConfigUpdate,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.更新)),
):
    """更新 CI/CD 配置"""
    result = await db.execute(select(CicdConfig).where(CicdConfig.id == config_id))
    config = result.scalar_one_or_none()
    if not config:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="CI/CD 配置不存在")

    if data.name is not None:
        config.name = data.name
    if data.ci_type is not None:
        config.ci_type = data.ci_type
    if data.webhook_url is not None:
        config.webhook_url = data.webhook_url
    if data.secret is not None:
        config.secret = data.secret
    if data.events is not None:
        config.events = data.events
    if data.is_active is not None:
        config.is_active = data.is_active

    await db.commit()
    await db.refresh(config)
    return config


@router.delete("/cicd/{config_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_cicd_config(
    config_id: int,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.删除)),
):
    """删除 CI/CD 配置"""
    result = await db.execute(select(CicdConfig).where(CicdConfig.id == config_id))
    config = result.scalar_one_or_none()
    if not config:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="CI/CD 配置不存在")

    await db.delete(config)
    await db.commit()


# ==================== 通知渠道 ====================


@router.get("/notifications", response_model=Page[NotificationChannelResponse])
async def list_notification_channels(
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页条数"),
    channel_type: str | None = Query(None, description="按渠道类型筛选(email/dingtalk/feishu/slack)"),
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.读取)),
):
    """获取通知渠道列表（分页）"""
    query = select(NotificationChannel)
    count_query = select(func.count(NotificationChannel.id))

    if channel_type is not None:
        query = query.where(NotificationChannel.channel_type == channel_type)
        count_query = count_query.where(NotificationChannel.channel_type == channel_type)

    total = (await db.execute(count_query)).scalar() or 0

    items = list(
        (
            await db.execute(
                query.order_by(NotificationChannel.id)
                .offset((page - 1) * page_size)
                .limit(page_size)
            )
        ).scalars().all()
    )

    return page_from_query(NotificationChannelResponse, items, total, page, page_size)


@router.post(
    "/notifications", response_model=NotificationChannelResponse, status_code=status.HTTP_201_CREATED
)
async def create_notification_channel(
    data: NotificationChannelCreate,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.创建)),
):
    """创建通知渠道"""
    channel = NotificationChannel(
        name=data.name,
        channel_type=data.channel_type,
        config=data.config,
    )
    db.add(channel)
    await db.commit()
    await db.refresh(channel)
    return channel


@router.put("/notifications/{channel_id}", response_model=NotificationChannelResponse)
async def update_notification_channel(
    channel_id: int,
    data: NotificationChannelUpdate,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.更新)),
):
    """更新通知渠道"""
    result = await db.execute(select(NotificationChannel).where(NotificationChannel.id == channel_id))
    channel = result.scalar_one_or_none()
    if not channel:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="通知渠道不存在")

    if data.name is not None:
        channel.name = data.name
    if data.channel_type is not None:
        channel.channel_type = data.channel_type
    if data.config is not None:
        channel.config = data.config
    if data.is_active is not None:
        channel.is_active = data.is_active

    await db.commit()
    await db.refresh(channel)
    return channel


@router.delete("/notifications/{channel_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_notification_channel(
    channel_id: int,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.删除)),
):
    """删除通知渠道"""
    result = await db.execute(select(NotificationChannel).where(NotificationChannel.id == channel_id))
    channel = result.scalar_one_or_none()
    if not channel:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="通知渠道不存在")

    await db.delete(channel)
    await db.commit()


@router.post("/notifications/{channel_id}/test", status_code=status.HTTP_200_OK)
async def test_notification_channel(
    channel_id: int,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.读取)),
):
    """测试通知渠道（发送模拟通知）"""
    result = await db.execute(select(NotificationChannel).where(NotificationChannel.id == channel_id))
    channel = result.scalar_one_or_none()
    if not channel:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="通知渠道不存在")

    if not channel.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="通知渠道未启用")

    try:
        logger.info(f"模拟发送通知: channel={channel.name}, type={channel.channel_type}")
        # TODO: 调用实际通知发送逻辑
        return {
            "success": True,
            "message": f"测试通知已发送至 {channel.name} ({channel.channel_type})",
        }
    except Exception as e:
        logger.exception(f"通知发送失败: {channel.name}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"通知发送失败: {e}",
        )


# ==================== 外部工具 ====================


@router.get("/tools", response_model=Page[ExternalToolResponse])
async def list_external_tools(
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页条数"),
    tool_type: str | None = Query(None, description="按工具类型筛选(jira/git/zentao)"),
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.读取)),
):
    """获取外部工具列表（分页）"""
    query = select(ExternalTool)
    count_query = select(func.count(ExternalTool.id))

    if tool_type is not None:
        query = query.where(ExternalTool.tool_type == tool_type)
        count_query = count_query.where(ExternalTool.tool_type == tool_type)

    total = (await db.execute(count_query)).scalar() or 0

    items = list(
        (
            await db.execute(
                query.order_by(ExternalTool.id)
                .offset((page - 1) * page_size)
                .limit(page_size)
            )
        ).scalars().all()
    )

    return page_from_query(ExternalToolResponse, items, total, page, page_size)


@router.post("/tools", response_model=ExternalToolResponse, status_code=status.HTTP_201_CREATED)
async def create_external_tool(
    data: ExternalToolCreate,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.创建)),
):
    """创建外部工具配置"""
    tool = ExternalTool(
        name=data.name,
        tool_type=data.tool_type,
        config=data.config,
    )
    db.add(tool)
    await db.commit()
    await db.refresh(tool)
    return tool


@router.put("/tools/{tool_id}", response_model=ExternalToolResponse)
async def update_external_tool(
    tool_id: int,
    data: ExternalToolUpdate,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.更新)),
):
    """更新外部工具配置"""
    result = await db.execute(select(ExternalTool).where(ExternalTool.id == tool_id))
    tool = result.scalar_one_or_none()
    if not tool:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="外部工具不存在")

    if data.name is not None:
        tool.name = data.name
    if data.tool_type is not None:
        tool.tool_type = data.tool_type
    if data.config is not None:
        tool.config = data.config
    if data.is_active is not None:
        tool.is_active = data.is_active

    await db.commit()
    await db.refresh(tool)
    return tool


@router.delete("/tools/{tool_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_external_tool(
    tool_id: int,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.删除)),
):
    """删除外部工具配置"""
    result = await db.execute(select(ExternalTool).where(ExternalTool.id == tool_id))
    tool = result.scalar_one_or_none()
    if not tool:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="外部工具不存在")

    await db.delete(tool)
    await db.commit()
