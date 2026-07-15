"""去AI味配置路由 — 全局配置、领域术语、输出模板、词频黑名单"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.deai import DeaiBlacklist, DeaiConfig, DeaiOutputTemplate, DeaiTerm
from app.schemas.base import Page, page_from_query
from app.schemas.deai import (
    DeaiBlacklistCreate,
    DeaiBlacklistResponse,
    DeaiConfigResponse,
    DeaiConfigUpdate,
    DeaiTemplateCreate,
    DeaiTemplateResponse,
    DeaiTemplateUpdate,
    DeaiTermCreate,
    DeaiTermResponse,
    DeaiTermUpdate,
)
from app.utils.rbac import 操作, 检查权限

router = APIRouter(prefix="/api/v1/deai", tags=["去AI味配置"])


# ==================== 全局配置 ====================


@router.get("/config", response_model=DeaiConfigResponse)
async def get_config(
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.读取)),
):
    """获取去AI味全局配置（单行配置，不存在则创建默认配置）"""
    result = await db.execute(select(DeaiConfig).order_by(DeaiConfig.id).limit(1))
    config = result.scalar_one_or_none()
    if not config:
        config = DeaiConfig()
        db.add(config)
        await db.commit()
        await db.refresh(config)
    return config


@router.put("/config", response_model=DeaiConfigResponse)
async def update_config(
    data: DeaiConfigUpdate,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.更新)),
):
    """更新去AI味全局配置"""
    result = await db.execute(select(DeaiConfig).order_by(DeaiConfig.id).limit(1))
    config = result.scalar_one_or_none()
    if not config:
        config = DeaiConfig()
        db.add(config)

    if data.style is not None:
        config.style = data.style
    if data.variety is not None:
        config.variety = data.variety
    if data.humanize is not None:
        config.humanize = data.humanize
    if data.intensity is not None:
        config.intensity = data.intensity

    await db.commit()
    await db.refresh(config)
    return config


# ==================== 领域术语 ====================


@router.get("/terms", response_model=Page[DeaiTermResponse])
async def list_terms(
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页条数"),
    category: str | None = Query(None, description="按分类筛选"),
    search: str | None = Query(None, description="搜索术语"),
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.读取)),
):
    """获取领域术语列表（分页）"""
    query = select(DeaiTerm)
    count_query = select(func.count(DeaiTerm.id))

    if category:
        query = query.where(DeaiTerm.category == category)
        count_query = count_query.where(DeaiTerm.category == category)
    if search:
        like_pattern = f"%{search}%"
        query = query.where(DeaiTerm.term.like(like_pattern))
        count_query = count_query.where(DeaiTerm.term.like(like_pattern))

    # 获取总数
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # 获取分页数据
    query = query.order_by(DeaiTerm.id).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    items = list(result.scalars().all())

    return page_from_query(DeaiTermResponse, items, total, page, page_size)


@router.post("/terms", response_model=DeaiTermResponse, status_code=status.HTTP_201_CREATED)
async def create_term(
    data: DeaiTermCreate,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.创建)),
):
    """创建领域术语"""
    term = DeaiTerm(term=data.term, replacement=data.replacement, category=data.category)
    db.add(term)
    await db.commit()
    await db.refresh(term)
    return term


@router.put("/terms/{term_id}", response_model=DeaiTermResponse)
async def update_term(
    term_id: int,
    data: DeaiTermUpdate,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.更新)),
):
    """更新领域术语"""
    result = await db.execute(select(DeaiTerm).where(DeaiTerm.id == term_id))
    term = result.scalar_one_or_none()
    if not term:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="术语不存在")

    if data.term is not None:
        term.term = data.term
    if data.replacement is not None:
        term.replacement = data.replacement
    if data.category is not None:
        term.category = data.category

    await db.commit()
    await db.refresh(term)
    return term


@router.delete("/terms/{term_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_term(
    term_id: int,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.删除)),
):
    """删除领域术语"""
    result = await db.execute(select(DeaiTerm).where(DeaiTerm.id == term_id))
    term = result.scalar_one_or_none()
    if not term:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="术语不存在")

    await db.delete(term)
    await db.commit()


# ==================== 输出模板 ====================


@router.get("/templates", response_model=Page[DeaiTemplateResponse])
async def list_templates(
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页条数"),
    search: str | None = Query(None, description="搜索模板名称"),
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.读取)),
):
    """获取输出模板列表（分页）"""
    query = select(DeaiOutputTemplate)
    count_query = select(func.count(DeaiOutputTemplate.id))

    if search:
        like_pattern = f"%{search}%"
        query = query.where(DeaiOutputTemplate.name.like(like_pattern))
        count_query = count_query.where(DeaiOutputTemplate.name.like(like_pattern))

    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    query = query.order_by(DeaiOutputTemplate.id).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    items = list(result.scalars().all())

    return page_from_query(DeaiTemplateResponse, items, total, page, page_size)


@router.post("/templates", response_model=DeaiTemplateResponse, status_code=status.HTTP_201_CREATED)
async def create_template(
    data: DeaiTemplateCreate,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.创建)),
):
    """创建输出模板"""
    template = DeaiOutputTemplate(name=data.name, pattern=data.pattern, description=data.description)
    db.add(template)
    await db.commit()
    await db.refresh(template)
    return template


@router.put("/templates/{template_id}", response_model=DeaiTemplateResponse)
async def update_template(
    template_id: int,
    data: DeaiTemplateUpdate,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.更新)),
):
    """更新输出模板"""
    result = await db.execute(select(DeaiOutputTemplate).where(DeaiOutputTemplate.id == template_id))
    template = result.scalar_one_or_none()
    if not template:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="模板不存在")

    if data.name is not None:
        template.name = data.name
    if data.pattern is not None:
        template.pattern = data.pattern
    if data.description is not None:
        template.description = data.description

    await db.commit()
    await db.refresh(template)
    return template


@router.delete("/templates/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_template(
    template_id: int,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.删除)),
):
    """删除输出模板"""
    result = await db.execute(select(DeaiOutputTemplate).where(DeaiOutputTemplate.id == template_id))
    template = result.scalar_one_or_none()
    if not template:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="模板不存在")

    await db.delete(template)
    await db.commit()


# ==================== 黑名单 ====================


@router.get("/blacklist", response_model=Page[DeaiBlacklistResponse])
async def list_blacklist(
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页条数"),
    search: str | None = Query(None, description="搜索禁用词"),
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.读取)),
):
    """获取词频黑名单列表（分页）"""
    query = select(DeaiBlacklist)
    count_query = select(func.count(DeaiBlacklist.id))

    if search:
        like_pattern = f"%{search}%"
        query = query.where(DeaiBlacklist.word.like(like_pattern))
        count_query = count_query.where(DeaiBlacklist.word.like(like_pattern))

    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    query = query.order_by(DeaiBlacklist.id).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    items = list(result.scalars().all())

    return page_from_query(DeaiBlacklistResponse, items, total, page, page_size)


@router.post("/blacklist", response_model=DeaiBlacklistResponse, status_code=status.HTTP_201_CREATED)
async def create_blacklist_entry(
    data: DeaiBlacklistCreate,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.创建)),
):
    """添加禁用词"""
    # 检查是否已存在
    result = await db.execute(select(DeaiBlacklist).where(DeaiBlacklist.word == data.word))
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"禁用词 '{data.word}' 已存在",
        )

    entry = DeaiBlacklist(word=data.word, replacement=data.replacement)
    db.add(entry)
    await db.commit()
    await db.refresh(entry)
    return entry


@router.delete("/blacklist/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_blacklist_entry(
    entry_id: int,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.删除)),
):
    """删除禁用词"""
    result = await db.execute(select(DeaiBlacklist).where(DeaiBlacklist.id == entry_id))
    entry = result.scalar_one_or_none()
    if not entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="禁用词不存在")

    await db.delete(entry)
    await db.commit()
