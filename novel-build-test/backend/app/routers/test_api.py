"""接口测试路由 — 接口测试用例的 CRUD + 自动化切换/执行操作"""

import logging
import math

from fastapi import APIRouter, Body, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.test_modules import ApiTestCase
from app.schemas.test_modules import (
    ApiTestCaseCreate,
    ApiTestCasePage,
    ApiTestCaseResponse,
    ApiTestCaseUpdate,
)
from app.utils.rbac import 操作, 检查权限

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/test-api", tags=["接口测试"])


@router.get("/cases", response_model=ApiTestCasePage)
async def list_api_cases(
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页数量"),
    project_id: int | None = Query(None, description="按项目筛选"),
    method: str | None = Query(None, description="按请求方法筛选"),
    search: str | None = Query(None, description="按用例名称搜索"),
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.读取)),
):
    """获取接口测试用例列表（分页，支持多条件筛选）"""
    user_id = 当前用户["用户ID"]
    query = select(ApiTestCase).where(ApiTestCase.created_by == user_id)
    count_query = select(func.count()).select_from(ApiTestCase).where(ApiTestCase.created_by == user_id)

    if project_id:
        query = query.where(ApiTestCase.project_id == project_id)
        count_query = count_query.where(ApiTestCase.project_id == project_id)
    if method:
        query = query.where(ApiTestCase.method == method.upper())
        count_query = count_query.where(ApiTestCase.method == method.upper())
    if search:
        like_pattern = f"%{search}%"
        query = query.where(ApiTestCase.name.like(like_pattern))
        count_query = count_query.where(ApiTestCase.name.like(like_pattern))

    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    query = query.order_by(ApiTestCase.created_at.desc())
    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    items = list(result.scalars().all())

    return ApiTestCasePage(
        items=[ApiTestCaseResponse.model_validate(c) for c in items],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=math.ceil(total / page_size) if total > 0 else 0,
    )


@router.post("/cases", response_model=ApiTestCaseResponse, status_code=status.HTTP_201_CREATED)
async def create_api_case(
    case_data: ApiTestCaseCreate,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.创建)),
):
    """创建接口测试用例"""
    user_id = 当前用户["用户ID"]
    case = ApiTestCase(
        project_id=case_data.project_id,
        name=case_data.name,
        method=case_data.method,
        url=case_data.url,
        headers=case_data.headers,
        body=case_data.body,
        assertions=case_data.assertions,
        schedule=case_data.schedule,
        is_auto=case_data.is_auto,
        created_by=user_id,
    )
    db.add(case)
    await db.commit()
    await db.refresh(case)
    return case


@router.get("/cases/{case_id}", response_model=ApiTestCaseResponse)
async def get_api_case(
    case_id: int,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.读取)),
):
    """获取接口测试用例详情"""
    user_id = 当前用户["用户ID"]
    result = await db.execute(
        select(ApiTestCase).where(
            ApiTestCase.id == case_id,
            ApiTestCase.created_by == user_id,
        )
    )
    case = result.scalar_one_or_none()
    if not case:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="测试用例不存在")
    return case


@router.put("/cases/{case_id}", response_model=ApiTestCaseResponse)
async def update_api_case(
    case_id: int,
    case_data: ApiTestCaseUpdate,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.更新)),
):
    """更新接口测试用例"""
    user_id = 当前用户["用户ID"]
    result = await db.execute(
        select(ApiTestCase).where(
            ApiTestCase.id == case_id,
            ApiTestCase.created_by == user_id,
        )
    )
    case = result.scalar_one_or_none()
    if not case:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="测试用例不存在")

    update_data = case_data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(case, key, value)

    await db.commit()
    await db.refresh(case)
    return case


@router.delete("/cases/{case_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_api_case(
    case_id: int,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.删除)),
):
    """删除接口测试用例"""
    user_id = 当前用户["用户ID"]
    result = await db.execute(
        select(ApiTestCase).where(
            ApiTestCase.id == case_id,
            ApiTestCase.created_by == user_id,
        )
    )
    case = result.scalar_one_or_none()
    if not case:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="测试用例不存在")

    await db.delete(case)
    await db.commit()


@router.put("/cases/{case_id}/auto")
async def toggle_api_case_auto(
    case_id: int,
    is_auto: bool = Body(..., embed=True, description="是否自动化"),
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.更新)),
):
    """切换接口测试用例自动化开关"""
    user_id = 当前用户["用户ID"]
    result = await db.execute(
        select(ApiTestCase).where(
            ApiTestCase.id == case_id,
            ApiTestCase.created_by == user_id,
        )
    )
    case = result.scalar_one_or_none()
    if not case:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="测试用例不存在")

    case.is_auto = is_auto
    await db.commit()
    await db.refresh(case)

    status_text = "已开启" if is_auto else "已关闭"
    logger.info(f"切换接口测试用例自动化: {case.name} (id={case_id}) → {status_text}")
    return {
        "status": "ok",
        "case_id": case_id,
        "is_auto": case.is_auto,
        "message": f"接口测试用例「{case.name}」自动化{status_text}",
    }


@router.post("/cases/{case_id}/run")
async def run_api_case(
    case_id: int,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.更新)),
):
    """执行接口测试用例（模拟执行）"""
    user_id = 当前用户["用户ID"]
    result = await db.execute(
        select(ApiTestCase).where(
            ApiTestCase.id == case_id,
            ApiTestCase.created_by == user_id,
        )
    )
    case = result.scalar_one_or_none()
    if not case:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="测试用例不存在")

    logger.info(f"执行接口测试用例: {case.name} (id={case_id})")
    return {"status": "executed", "case_id": case_id}
