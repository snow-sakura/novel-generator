"""功能测试路由 — 功能测试用例的 CRUD + 导入/执行操作"""

import logging
import math

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.test_modules import FunctionalTestCase
from app.schemas.test_modules import (
    FunctionalCaseCreate,
    FunctionalCasePage,
    FunctionalCaseResponse,
    FunctionalCaseUpdate,
)
from app.utils.rbac import 操作, 检查权限

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/test-functional", tags=["功能测试"])


@router.get("/cases", response_model=FunctionalCasePage)
async def list_functional_cases(
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页数量"),
    project_id: int | None = Query(None, description="按项目筛选"),
    module: str | None = Query(None, description="按功能模块筛选"),
    priority: str | None = Query(None, description="按优先级筛选"),
    search: str | None = Query(None, description="按标题搜索"),
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.读取)),
):
    """获取功能测试用例列表（分页，支持多条件筛选）"""
    user_id = 当前用户["用户ID"]
    query = select(FunctionalTestCase).where(FunctionalTestCase.created_by == user_id)
    count_query = (
        select(func.count())
        .select_from(FunctionalTestCase)
        .where(FunctionalTestCase.created_by == user_id)
    )

    if project_id:
        query = query.where(FunctionalTestCase.project_id == project_id)
        count_query = count_query.where(FunctionalTestCase.project_id == project_id)
    if module:
        query = query.where(FunctionalTestCase.module == module)
        count_query = count_query.where(FunctionalTestCase.module == module)
    if priority:
        query = query.where(FunctionalTestCase.priority == priority)
        count_query = count_query.where(FunctionalTestCase.priority == priority)
    if search:
        like_pattern = f"%{search}%"
        query = query.where(FunctionalTestCase.title.like(like_pattern))
        count_query = count_query.where(FunctionalTestCase.title.like(like_pattern))

    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    query = query.order_by(FunctionalTestCase.created_at.desc())
    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    items = list(result.scalars().all())

    return FunctionalCasePage(
        items=[FunctionalCaseResponse.model_validate(c) for c in items],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=math.ceil(total / page_size) if total > 0 else 0,
    )


@router.post("/cases", response_model=FunctionalCaseResponse, status_code=status.HTTP_201_CREATED)
async def create_functional_case(
    case_data: FunctionalCaseCreate,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.创建)),
):
    """创建功能测试用例"""
    user_id = 当前用户["用户ID"]
    case = FunctionalTestCase(
        project_id=case_data.project_id,
        module=case_data.module,
        title=case_data.title,
        precondition=case_data.precondition,
        steps=case_data.steps,
        expected=case_data.expected,
        priority=case_data.priority,
        created_by=user_id,
    )
    db.add(case)
    await db.commit()
    await db.refresh(case)
    return case


@router.post("/cases/import", status_code=status.HTTP_201_CREATED)
async def import_functional_cases(
    cases: list[FunctionalCaseCreate],
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.创建)),
):
    """批量导入功能测试用例（模拟导入）"""
    user_id = 当前用户["用户ID"]
    created = 0
    for case_data in cases:
        case = FunctionalTestCase(
            project_id=case_data.project_id,
            module=case_data.module,
            title=case_data.title,
            precondition=case_data.precondition,
            steps=case_data.steps,
            expected=case_data.expected,
            priority=case_data.priority,
            created_by=user_id,
        )
        db.add(case)
        created += 1
    await db.commit()
    logger.info(f"批量导入功能测试用例: {created} 条 (用户 {user_id})")
    return {"imported": created, "message": f"成功导入 {created} 条功能测试用例"}


@router.get("/cases/{case_id}", response_model=FunctionalCaseResponse)
async def get_functional_case(
    case_id: int,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.读取)),
):
    """获取功能测试用例详情"""
    user_id = 当前用户["用户ID"]
    result = await db.execute(
        select(FunctionalTestCase).where(
            FunctionalTestCase.id == case_id,
            FunctionalTestCase.created_by == user_id,
        )
    )
    case = result.scalar_one_or_none()
    if not case:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="测试用例不存在")
    return case


@router.put("/cases/{case_id}", response_model=FunctionalCaseResponse)
async def update_functional_case(
    case_id: int,
    case_data: FunctionalCaseUpdate,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.更新)),
):
    """更新功能测试用例"""
    user_id = 当前用户["用户ID"]
    result = await db.execute(
        select(FunctionalTestCase).where(
            FunctionalTestCase.id == case_id,
            FunctionalTestCase.created_by == user_id,
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
async def delete_functional_case(
    case_id: int,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.删除)),
):
    """删除功能测试用例"""
    user_id = 当前用户["用户ID"]
    result = await db.execute(
        select(FunctionalTestCase).where(
            FunctionalTestCase.id == case_id,
            FunctionalTestCase.created_by == user_id,
        )
    )
    case = result.scalar_one_or_none()
    if not case:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="测试用例不存在")

    await db.delete(case)
    await db.commit()


@router.post("/cases/{case_id}/run")
async def run_functional_case(
    case_id: int,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.更新)),
):
    """执行功能测试用例（模拟执行）"""
    user_id = 当前用户["用户ID"]
    result = await db.execute(
        select(FunctionalTestCase).where(
            FunctionalTestCase.id == case_id,
            FunctionalTestCase.created_by == user_id,
        )
    )
    case = result.scalar_one_or_none()
    if not case:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="测试用例不存在")

    logger.info(f"执行功能测试用例: {case.title} (id={case_id})")
    return {"status": "executed", "case_id": case_id}
