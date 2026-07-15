"""AI 聊天室路由 — 会话与消息管理"""

import logging

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import delete, desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.chat import ChatMessage, ChatSession
from app.schemas.base import page_from_query
from app.schemas.phase3 import (
    ChatMessageCreate,
    ChatMessagePage,
    ChatMessageResponse,
    ChatSessionCreate,
    ChatSessionPage,
    ChatSessionResponse,
)
from app.utils.rbac import 操作, 检查权限

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/chat", tags=["AI 聊天室"])


@router.get("/sessions", response_model=ChatSessionPage)
async def list_sessions(
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页数量"),
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.读取)),
):
    """获取当前用户的聊天会话列表（分页）"""
    user_id = 当前用户["用户ID"]

    count_result = await db.execute(
        select(func.count()).select_from(ChatSession).where(ChatSession.created_by == user_id)
    )
    total = count_result.scalar() or 0

    result = await db.execute(
        select(ChatSession)
        .where(ChatSession.created_by == user_id)
        .order_by(desc(ChatSession.updated_at))
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    items = list(result.scalars().all())

    return page_from_query(ChatSessionResponse, items, total, page, page_size)


@router.post("/sessions", response_model=ChatSessionResponse, status_code=status.HTTP_201_CREATED)
async def create_session(
    data: ChatSessionCreate,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.创建)),
):
    """创建新的聊天会话"""
    user_id = 当前用户["用户ID"]
    session = ChatSession(
        title=data.title,
        model=data.model,
        created_by=user_id,
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return session


@router.get("/sessions/{session_id}", response_model=ChatSessionResponse)
async def get_session(
    session_id: int,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.读取)),
):
    """获取聊天会话详情"""
    user_id = 当前用户["用户ID"]
    result = await db.execute(
        select(ChatSession).where(
            ChatSession.id == session_id,
            ChatSession.created_by == user_id,
        )
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="会话不存在")
    return session


@router.delete("/sessions/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_session(
    session_id: int,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.删除)),
):
    """删除聊天会话及其所有消息"""
    user_id = 当前用户["用户ID"]
    result = await db.execute(
        select(ChatSession).where(
            ChatSession.id == session_id,
            ChatSession.created_by == user_id,
        )
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="会话不存在")

    try:
        # 先删除会话下的所有消息
        await db.execute(delete(ChatMessage).where(ChatMessage.session_id == session_id))
        await db.delete(session)
        await db.commit()
    except Exception:
        logger.exception("删除会话失败")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="删除会话失败")


@router.get("/sessions/{session_id}/messages", response_model=ChatMessagePage)
async def list_messages(
    session_id: int,
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页数量"),
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.读取)),
):
    """获取聊天会话的消息列表（分页）"""
    user_id = 当前用户["用户ID"]

    # 验证会话归属
    session_result = await db.execute(
        select(ChatSession).where(
            ChatSession.id == session_id,
            ChatSession.created_by == user_id,
        )
    )
    if not session_result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="会话不存在")

    count_result = await db.execute(
        select(func.count()).select_from(ChatMessage).where(ChatMessage.session_id == session_id)
    )
    total = count_result.scalar() or 0

    result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.created_at)
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    items = list(result.scalars().all())

    return page_from_query(ChatMessageResponse, items, total, page, page_size)


@router.post(
    "/sessions/{session_id}/messages",
    response_model=ChatMessageResponse,
    status_code=status.HTTP_201_CREATED,
)
async def send_message(
    session_id: int,
    data: ChatMessageCreate,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.创建)),
):
    """发送消息并获取 AI 回复（当前返回 mock 回复）"""
    user_id = 当前用户["用户ID"]

    # 验证会话归属
    session_result = await db.execute(
        select(ChatSession).where(
            ChatSession.id == session_id,
            ChatSession.created_by == user_id,
        )
    )
    session = session_result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="会话不存在")

    try:
        # 保存用户消息
        user_msg = ChatMessage(
            session_id=session_id,
            role=data.role,
            content=data.content,
        )
        db.add(user_msg)
        await db.flush()

        # 创建 mock AI 回复消息
        assistant_msg = ChatMessage(
            session_id=session_id,
            role="assistant",
            content="已收到您的消息，AI 回复功能正在开发中...",
        )
        db.add(assistant_msg)
        await db.commit()
        await db.refresh(assistant_msg)

        return assistant_msg
    except Exception:
        logger.exception("发送消息失败")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="发送消息失败")
