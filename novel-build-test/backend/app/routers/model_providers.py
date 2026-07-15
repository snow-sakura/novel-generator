"""模型配置路由 — ModelProvider / AIModel / TierConfig / CostRecord CRUD"""

import datetime
import math
import logging
import random

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func, desc, cast, Date
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)

from app.database import get_db
from app.models.model_provider import ModelProvider, AIModel, ModelTierConfig, CostRecord
from app.schemas.model_provider import (
    ModelProviderCreate,
    ModelProviderUpdate,
    ModelProviderResponse,
    ModelProviderPage,
    AIModelCreate,
    AIModelUpdate,
    AIModelResponse,
    AIModelPage,
    TierConfigCreate,
    TierConfigUpdate,
    TierConfigResponse,
    TierConfigPage,
    CostRecordResponse,
    CostRecordPage,
    CostOverview,
    CostTrend,
    ProviderTestRequest,
    ProviderTestResponse,
)
from app.utils.rbac import 操作, 检查权限

router = APIRouter(prefix="/api/v1", tags=["模型配置"])


# ===================================================================
#  ModelProviders CRUD
# ===================================================================


@router.get("/model-providers", response_model=ModelProviderPage)
async def list_model_providers(
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页数量"),
    search: str | None = Query(None, description="按名称搜索"),
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.读取)),
):
    """获取 LLM 提供商列表（分页，支持按名称搜索）"""
    try:
        query = select(ModelProvider)
        count_query = select(func.count()).select_from(ModelProvider)

        if search:
            like_pattern = f"%{search}%"
            query = query.where(ModelProvider.name.like(like_pattern))
            count_query = count_query.where(ModelProvider.name.like(like_pattern))

        # 总数
        total_result = await db.execute(count_query)
        total = total_result.scalar() or 0

        # 分页
        query = query.order_by(ModelProvider.sort_order.asc(), ModelProvider.created_at.desc())
        query = query.offset((page - 1) * page_size).limit(page_size)
        result = await db.execute(query)
        items = list(result.scalars().all())

        return ModelProviderPage(
            items=[ModelProviderResponse.model_validate(p) for p in items],
            total=total,
            page=page,
            page_size=page_size,
            total_pages=math.ceil(total / page_size) if total > 0 else 0,
        )
    except Exception:
        logger.exception("查询提供商列表失败")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="查询失败")


@router.get("/model-providers/{provider_id}", response_model=ModelProviderResponse)
async def get_model_provider(
    provider_id: int,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.读取)),
):
    """获取 LLM 提供商详情"""
    try:
        result = await db.execute(select(ModelProvider).where(ModelProvider.id == provider_id))
        provider = result.scalar_one_or_none()
        if not provider:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="提供商不存在")
        return provider
    except HTTPException:
        raise
    except Exception:
        logger.exception("查询提供商详情失败")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="查询失败")


@router.post("/model-providers", response_model=ModelProviderResponse, status_code=status.HTTP_201_CREATED)
async def create_model_provider(
    provider_data: ModelProviderCreate,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.创建)),
):
    """创建 LLM 提供商"""
    try:
        provider = ModelProvider(
            name=provider_data.name,
            provider_type=provider_data.provider_type,
            api_key=provider_data.api_key,
            base_url=provider_data.base_url,
            config=provider_data.config,
            sort_order=provider_data.sort_order,
        )
        db.add(provider)
        await db.commit()
        await db.refresh(provider)
        return provider
    except Exception:
        logger.exception("创建提供商失败")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="创建失败")


@router.put("/model-providers/{provider_id}", response_model=ModelProviderResponse)
async def update_model_provider(
    provider_id: int,
    provider_data: ModelProviderUpdate,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.更新)),
):
    """更新 LLM 提供商信息"""
    try:
        result = await db.execute(select(ModelProvider).where(ModelProvider.id == provider_id))
        provider = result.scalar_one_or_none()
        if not provider:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="提供商不存在")

        update_data = provider_data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(provider, key, value)

        await db.commit()
        await db.refresh(provider)
        return provider
    except HTTPException:
        raise
    except Exception:
        logger.exception("更新提供商失败")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="更新失败")


@router.delete("/model-providers/{provider_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_model_provider(
    provider_id: int,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.删除)),
):
    """删除 LLM 提供商"""
    try:
        result = await db.execute(select(ModelProvider).where(ModelProvider.id == provider_id))
        provider = result.scalar_one_or_none()
        if not provider:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="提供商不存在")

        await db.delete(provider)
        await db.commit()
    except HTTPException:
        raise
    except Exception:
        logger.exception("删除提供商失败")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="删除失败")


@router.post("/model-providers/{provider_id}/test", response_model=ProviderTestResponse)
async def test_model_provider_connectivity(
    provider_id: int,
    test_data: ProviderTestRequest | None = None,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.读取)),
):
    """测试 LLM 提供商连通性（模拟测试）"""
    try:
        result = await db.execute(select(ModelProvider).where(ModelProvider.id == provider_id))
        provider = result.scalar_one_or_none()
        if not provider:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="提供商不存在")

        # 模拟连通性测试
        latency = random.randint(100, 2000)
        return ProviderTestResponse(
            success=True,
            message=f"连接成功（模拟测试），延迟 {latency}ms",
            latency_ms=latency,
        )
    except HTTPException:
        raise
    except Exception:
        logger.exception("测试连通性失败")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="测试失败")


# ===================================================================
#  AIModels CRUD
# ===================================================================


@router.get("/model-providers/{provider_id}/models", response_model=AIModelPage)
async def list_models_by_provider(
    provider_id: int,
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页数量"),
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.读取)),
):
    """获取指定提供商下的模型列表（分页）"""
    try:
        # 验证提供商存在
        provider_exists = await db.execute(
            select(func.count()).select_from(ModelProvider).where(ModelProvider.id == provider_id)
        )
        if provider_exists.scalar() == 0:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="提供商不存在")

        base_filter = AIModel.provider_id == provider_id
        query = select(AIModel).where(base_filter)
        count_query = select(func.count()).select_from(AIModel).where(base_filter)

        total_result = await db.execute(count_query)
        total = total_result.scalar() or 0

        query = query.order_by(AIModel.id.asc())
        query = query.offset((page - 1) * page_size).limit(page_size)
        result = await db.execute(query)
        items = list(result.scalars().all())

        return AIModelPage(
            items=[AIModelResponse.model_validate(m) for m in items],
            total=total,
            page=page,
            page_size=page_size,
            total_pages=math.ceil(total / page_size) if total > 0 else 0,
        )
    except HTTPException:
        raise
    except Exception:
        logger.exception("查询模型列表失败")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="查询失败")


@router.get("/models/{model_id}", response_model=AIModelResponse)
async def get_ai_model(
    model_id: int,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.读取)),
):
    """获取 AI 模型详情（全局访问）"""
    try:
        result = await db.execute(select(AIModel).where(AIModel.id == model_id))
        model = result.scalar_one_or_none()
        if not model:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="模型不存在")
        return model
    except HTTPException:
        raise
    except Exception:
        logger.exception("查询模型详情失败")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="查询失败")


@router.post(
    "/model-providers/{provider_id}/models",
    response_model=AIModelResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_ai_model(
    provider_id: int,
    model_data: AIModelCreate,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.创建)),
):
    """在当前提供商下创建 AI 模型"""
    try:
        # 验证提供商存在
        provider_result = await db.execute(select(ModelProvider).where(ModelProvider.id == provider_id))
        if not provider_result.scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="提供商不存在")

        model = AIModel(
            provider_id=provider_id,
            name=model_data.name,
            display_name=model_data.display_name,
            max_tokens=model_data.max_tokens,
            input_price_per_m=model_data.input_price_per_m,
            output_price_per_m=model_data.output_price_per_m,
        )
        db.add(model)
        await db.commit()
        await db.refresh(model)
        return model
    except HTTPException:
        raise
    except Exception:
        logger.exception("创建模型失败")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="创建失败")


@router.put("/models/{model_id}", response_model=AIModelResponse)
async def update_ai_model(
    model_id: int,
    model_data: AIModelUpdate,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.更新)),
):
    """更新 AI 模型信息"""
    try:
        result = await db.execute(select(AIModel).where(AIModel.id == model_id))
        model = result.scalar_one_or_none()
        if not model:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="模型不存在")

        update_data = model_data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(model, key, value)

        await db.commit()
        await db.refresh(model)
        return model
    except HTTPException:
        raise
    except Exception:
        logger.exception("更新模型失败")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="更新失败")


@router.delete("/models/{model_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_ai_model(
    model_id: int,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.删除)),
):
    """删除 AI 模型"""
    try:
        result = await db.execute(select(AIModel).where(AIModel.id == model_id))
        model = result.scalar_one_or_none()
        if not model:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="模型不存在")

        await db.delete(model)
        await db.commit()
    except HTTPException:
        raise
    except Exception:
        logger.exception("删除模型失败")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="删除失败")


# ===================================================================
#  ModelTierConfigs CRUD
# ===================================================================


@router.get("/model-tiers", response_model=TierConfigPage)
async def list_model_tiers(
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页数量"),
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.读取)),
):
    """获取所有模型分级配置（分页）"""
    try:
        query = select(ModelTierConfig)
        count_query = select(func.count()).select_from(ModelTierConfig)

        total_result = await db.execute(count_query)
        total = total_result.scalar() or 0

        query = query.order_by(ModelTierConfig.weight.desc(), ModelTierConfig.id.asc())
        query = query.offset((page - 1) * page_size).limit(page_size)
        result = await db.execute(query)
        items = list(result.scalars().all())

        return TierConfigPage(
            items=[TierConfigResponse.model_validate(t) for t in items],
            total=total,
            page=page,
            page_size=page_size,
            total_pages=math.ceil(total / page_size) if total > 0 else 0,
        )
    except Exception:
        logger.exception("查询分级配置列表失败")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="查询失败")


@router.get("/model-tiers/{tier_id}", response_model=TierConfigResponse)
async def get_model_tier(
    tier_id: int,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.读取)),
):
    """获取模型分级配置详情"""
    try:
        result = await db.execute(select(ModelTierConfig).where(ModelTierConfig.id == tier_id))
        tier = result.scalar_one_or_none()
        if not tier:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="分级配置不存在")
        return tier
    except HTTPException:
        raise
    except Exception:
        logger.exception("查询分级配置详情失败")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="查询失败")


@router.post("/model-tiers", response_model=TierConfigResponse, status_code=status.HTTP_201_CREATED)
async def create_model_tier(
    tier_data: TierConfigCreate,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.创建)),
):
    """创建模型分级配置"""
    try:
        tier = ModelTierConfig(
            name=tier_data.name,
            description=tier_data.description,
            model_id=tier_data.model_id,
            rules=tier_data.rules,
            weight=tier_data.weight,
        )
        db.add(tier)
        await db.commit()
        await db.refresh(tier)
        return tier
    except Exception:
        logger.exception("创建分级配置失败")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="创建失败")


@router.put("/model-tiers/{tier_id}", response_model=TierConfigResponse)
async def update_model_tier(
    tier_id: int,
    tier_data: TierConfigUpdate,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.更新)),
):
    """更新模型分级配置"""
    try:
        result = await db.execute(select(ModelTierConfig).where(ModelTierConfig.id == tier_id))
        tier = result.scalar_one_or_none()
        if not tier:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="分级配置不存在")

        update_data = tier_data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(tier, key, value)

        await db.commit()
        await db.refresh(tier)
        return tier
    except HTTPException:
        raise
    except Exception:
        logger.exception("更新分级配置失败")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="更新失败")


@router.delete("/model-tiers/{tier_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_model_tier(
    tier_id: int,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.删除)),
):
    """删除模型分级配置"""
    try:
        result = await db.execute(select(ModelTierConfig).where(ModelTierConfig.id == tier_id))
        tier = result.scalar_one_or_none()
        if not tier:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="分级配置不存在")

        await db.delete(tier)
        await db.commit()
    except HTTPException:
        raise
    except Exception:
        logger.exception("删除分级配置失败")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="删除失败")


# ===================================================================
#  CostRecords
# ===================================================================


@router.get("/model-costs", response_model=CostRecordPage)
async def list_cost_records(
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页数量"),
    model_id: int | None = Query(None, description="按模型ID筛选"),
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.读取)),
):
    """获取成本记录列表（分页，支持按模型筛选）"""
    try:
        query = select(CostRecord)
        count_query = select(func.count()).select_from(CostRecord)

        if model_id is not None:
            query = query.where(CostRecord.model_id == model_id)
            count_query = count_query.where(CostRecord.model_id == model_id)

        total_result = await db.execute(count_query)
        total = total_result.scalar() or 0

        query = query.order_by(desc(CostRecord.created_at))
        query = query.offset((page - 1) * page_size).limit(page_size)
        result = await db.execute(query)
        items = list(result.scalars().all())

        return CostRecordPage(
            items=[CostRecordResponse.model_validate(c) for c in items],
            total=total,
            page=page,
            page_size=page_size,
            total_pages=math.ceil(total / page_size) if total > 0 else 0,
        )
    except Exception:
        logger.exception("查询成本记录失败")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="查询失败")


@router.get("/model-costs/overview", response_model=CostOverview)
async def get_cost_overview(
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.读取)),
):
    """获取成本概览（总计、按模型拆分）"""
    try:
        # 全局统计
        agg_result = await db.execute(
            select(
                func.count(CostRecord.id),
                func.sum(CostRecord.cost_yuan),
                func.sum(CostRecord.input_tokens),
                func.sum(CostRecord.output_tokens),
            ).select_from(CostRecord)
        )
        row = agg_result.one()
        execution_count = row[0] or 0
        total_cost = float(row[1] or 0)
        total_input_tokens = row[2] or 0
        total_output_tokens = row[3] or 0

        # 按模型分组统计
        breakdown_result = await db.execute(
            select(
                CostRecord.model_id,
                func.count(CostRecord.id),
                func.sum(CostRecord.cost_yuan),
                func.sum(CostRecord.input_tokens),
                func.sum(CostRecord.output_tokens),
            )
            .select_from(CostRecord)
            .group_by(CostRecord.model_id)
        )
        model_breakdown = []
        for row in breakdown_result.all():
            model_breakdown.append({
                "model_id": row[0],
                "execution_count": row[1] or 0,
                "total_cost": float(row[2] or 0),
                "total_input_tokens": row[3] or 0,
                "total_output_tokens": row[4] or 0,
            })

        return CostOverview(
            total_cost=total_cost,
            total_input_tokens=total_input_tokens,
            total_output_tokens=total_output_tokens,
            execution_count=execution_count,
            model_breakdown=model_breakdown,
        )
    except Exception:
        logger.exception("查询成本概览失败")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="查询失败")


@router.get("/model-costs/trend", response_model=CostTrend)
async def get_cost_trend(
    days: int = Query(30, ge=1, le=365, description="统计天数"),
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.读取)),
):
    """获取成本趋势（按日统计）"""
    try:
        since = datetime.datetime.now() - datetime.timedelta(days=days)

        trend_result = await db.execute(
            select(
                cast(CostRecord.created_at, Date).label("date"),
                func.count(CostRecord.id),
                func.sum(CostRecord.cost_yuan),
                func.sum(CostRecord.input_tokens),
                func.sum(CostRecord.output_tokens),
            )
            .select_from(CostRecord)
            .where(CostRecord.created_at >= since)
            .group_by(cast(CostRecord.created_at, Date))
            .order_by(cast(CostRecord.created_at, Date).asc())
        )

        daily_costs = []
        for row in trend_result.all():
            daily_costs.append({
                "date": str(row[0]) if row[0] else "",
                "execution_count": row[1] or 0,
                "total_cost": float(row[2] or 0),
                "total_input_tokens": row[3] or 0,
                "total_output_tokens": row[4] or 0,
            })

        return CostTrend(daily_costs=daily_costs)
    except Exception:
        logger.exception("查询成本趋势失败")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="查询失败")
