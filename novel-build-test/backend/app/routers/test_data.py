"""测试数据配置路由 — 数据源、脱敏规则、Mock 服务与 AI 生成"""

import logging

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.test_modules import DataSource, MaskingRule, MockService
from app.schemas.base import Page, page_from_query
from app.schemas.test_modules import (
    DataSourceCreate,
    DataSourceResponse,
    DataSourceUpdate,
    MaskingRuleCreate,
    MaskingRuleResponse,
    MaskingRuleUpdate,
    MockServiceCreate,
    MockServiceResponse,
    MockServiceUpdate,
)
from app.utils.rbac import 操作, 检查权限

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/test-data", tags=["测试数据配置"])


# ==================== 数据源 ====================


@router.get("/sources", response_model=Page[DataSourceResponse])
async def list_data_sources(
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页数量"),
    project_id: int | None = Query(None, description="按项目筛选"),
    source_type: str | None = Query(None, description="按数据源类型筛选"),
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.读取)),
):
    """获取数据源列表（分页，支持按项目和类型筛选）"""
    base_query = select(DataSource)
    count_base = select(func.count()).select_from(DataSource)

    if project_id is not None:
        base_query = base_query.where(DataSource.project_id == project_id)
        count_base = count_base.where(DataSource.project_id == project_id)
    if source_type is not None:
        base_query = base_query.where(DataSource.source_type == source_type)
        count_base = count_base.where(DataSource.source_type == source_type)

    total = (await db.execute(count_base)).scalar() or 0

    query = (
        base_query.order_by(DataSource.updated_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    result = await db.execute(query)
    items = list(result.scalars().all())

    return page_from_query(DataSourceResponse, items, total, page, page_size)


@router.post(
    "/sources",
    response_model=DataSourceResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_data_source(
    data: DataSourceCreate,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.创建)),
):
    """创建数据源"""
    source = DataSource(
        project_id=data.project_id,
        name=data.name,
        source_type=data.source_type,
        config=data.config,
    )
    db.add(source)
    await db.commit()
    await db.refresh(source)
    return source


@router.put("/sources/{source_id}", response_model=DataSourceResponse)
async def update_data_source(
    source_id: int,
    data: DataSourceUpdate,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.更新)),
):
    """更新数据源"""
    result = await db.execute(
        select(DataSource).where(DataSource.id == source_id)
    )
    source = result.scalar_one_or_none()
    if not source:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="数据源不存在")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(source, key, value)

    await db.commit()
    await db.refresh(source)
    return source


@router.delete("/sources/{source_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_data_source(
    source_id: int,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.删除)),
):
    """删除数据源"""
    result = await db.execute(
        select(DataSource).where(DataSource.id == source_id)
    )
    source = result.scalar_one_or_none()
    if not source:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="数据源不存在")

    await db.delete(source)
    await db.commit()


@router.post("/sources/{source_id}/test")
async def test_data_source_connection(
    source_id: int,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.读取)),
):
    """模拟测试数据源连接"""
    result = await db.execute(
        select(DataSource).where(DataSource.id == source_id)
    )
    source = result.scalar_one_or_none()
    if not source:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="数据源不存在")

    return {
        "source_id": source.id,
        "name": source.name,
        "connected": True,
        "message": f"模拟连接 '{source.name}' 成功。",
    }


# ==================== 脱敏规则 ====================


@router.get("/masking-rules", response_model=Page[MaskingRuleResponse])
async def list_masking_rules(
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页数量"),
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.读取)),
):
    """获取脱敏规则列表（分页）"""
    count_query = select(func.count()).select_from(MaskingRule)
    total = (await db.execute(count_query)).scalar() or 0

    query = (
        select(MaskingRule)
        .order_by(MaskingRule.name)
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    result = await db.execute(query)
    items = list(result.scalars().all())

    return page_from_query(MaskingRuleResponse, items, total, page, page_size)


@router.post(
    "/masking-rules",
    response_model=MaskingRuleResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_masking_rule(
    data: MaskingRuleCreate,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.创建)),
):
    """创建脱敏规则"""
    rule = MaskingRule(
        name=data.name,
        field_pattern=data.field_pattern,
        strategy=data.strategy,
        config=data.config,
    )
    db.add(rule)
    await db.commit()
    await db.refresh(rule)
    return rule


@router.put(
    "/masking-rules/{rule_id}", response_model=MaskingRuleResponse
)
async def update_masking_rule(
    rule_id: int,
    data: MaskingRuleUpdate,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.更新)),
):
    """更新脱敏规则"""
    result = await db.execute(
        select(MaskingRule).where(MaskingRule.id == rule_id)
    )
    rule = result.scalar_one_or_none()
    if not rule:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="脱敏规则不存在")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(rule, key, value)

    await db.commit()
    await db.refresh(rule)
    return rule


@router.delete(
    "/masking-rules/{rule_id}", status_code=status.HTTP_204_NO_CONTENT
)
async def delete_masking_rule(
    rule_id: int,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.删除)),
):
    """删除脱敏规则"""
    result = await db.execute(
        select(MaskingRule).where(MaskingRule.id == rule_id)
    )
    rule = result.scalar_one_or_none()
    if not rule:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="脱敏规则不存在")

    await db.delete(rule)
    await db.commit()


# ==================== Mock 服务 ====================


@router.get("/mocks", response_model=Page[MockServiceResponse])
async def list_mock_services(
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页数量"),
    project_id: int | None = Query(None, description="按项目筛选"),
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.读取)),
):
    """获取 Mock 服务列表（分页，支持按项目筛选）"""
    base_query = select(MockService)
    count_base = select(func.count()).select_from(MockService)

    if project_id is not None:
        base_query = base_query.where(MockService.project_id == project_id)
        count_base = count_base.where(MockService.project_id == project_id)

    total = (await db.execute(count_base)).scalar() or 0

    query = (
        base_query.order_by(MockService.updated_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    result = await db.execute(query)
    items = list(result.scalars().all())

    return page_from_query(MockServiceResponse, items, total, page, page_size)


@router.post(
    "/mocks",
    response_model=MockServiceResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_mock_service(
    data: MockServiceCreate,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.创建)),
):
    """创建 Mock 服务"""
    service = MockService(
        project_id=data.project_id,
        name=data.name,
        config=data.config,
    )
    db.add(service)
    await db.commit()
    await db.refresh(service)
    return service


@router.put("/mocks/{service_id}", response_model=MockServiceResponse)
async def update_mock_service(
    service_id: int,
    data: MockServiceUpdate,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.更新)),
):
    """更新 Mock 服务"""
    result = await db.execute(
        select(MockService).where(MockService.id == service_id)
    )
    service = result.scalar_one_or_none()
    if not service:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Mock 服务不存在")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(service, key, value)

    await db.commit()
    await db.refresh(service)
    return service


@router.delete(
    "/mocks/{service_id}", status_code=status.HTTP_204_NO_CONTENT
)
async def delete_mock_service(
    service_id: int,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.删除)),
):
    """删除 Mock 服务"""
    result = await db.execute(
        select(MockService).where(MockService.id == service_id)
    )
    service = result.scalar_one_or_none()
    if not service:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Mock 服务不存在")

    await db.delete(service)
    await db.commit()


# ==================== AI 生成 ====================


class AiGenerateRequest(BaseModel):
    """AI 数据生成请求"""
    prompt: str = Field(..., min_length=1, description="生成描述")
    count: int = Field(1, ge=1, le=1000, description="生成条数")


class AiGenerateItem(BaseModel):
    """生成的数据项"""
    id: int
    content: str


class AiGenerateResponse(BaseModel):
    """AI 数据生成响应"""
    items: list[AiGenerateItem]
    total: int
    prompt: str
    message: str = "模拟 AI 数据生成完成。"


@router.post("/generate")
async def ai_generate_data(
    data: AiGenerateRequest,
    当前用户: dict = Depends(检查权限(操作.创建)),
):
    """模拟 AI 测试数据生成"""
    user_id = 当前用户["用户ID"]
    logger.info("用户 %s 请求 AI 生成测试数据: prompt=%s, count=%d", user_id, data.prompt, data.count)

    try:
        items = [
            AiGenerateItem(
                id=i + 1,
                content=f"[模拟] {data.prompt} - 第{i + 1}条",
            )
            for i in range(data.count)
        ]
        return AiGenerateResponse(
            items=items,
            total=data.count,
            prompt=data.prompt,
        )
    except Exception:
        logger.exception("AI 数据生成失败")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="AI 数据生成失败",
        )
