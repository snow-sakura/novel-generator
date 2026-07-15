"""App 自动化测试路由 — 脚本 CRUD + 设备管理"""

import math

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.test_modules import AppTestScript, TestDevice
from app.schemas.test_modules import (
    AppScriptCreate,
    AppScriptResponse,
    AppScriptPage,
    AppScriptUpdate,
    DeviceCreate,
    DeviceResponse,
    DevicePage,
    DeviceUpdate,
)
from app.utils.rbac import 操作, 检查权限

router = APIRouter(prefix="/api/v1/test-app", tags=["App自动化测试"])

# ==================== 脚本管理 ====================


@router.get("/scripts", response_model=AppScriptPage)
async def list_app_scripts(
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页数量"),
    project_id: int | None = Query(None, description="按项目筛选"),
    platform: str | None = Query(None, description="按平台筛选 (ios/android)"),
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.读取)),
):
    """获取 App 自动化脚本列表（分页，支持筛选）"""
    user_id = 当前用户["用户ID"]
    query = select(AppTestScript).where(AppTestScript.created_by == user_id)
    count_query = (
        select(func.count())
        .select_from(AppTestScript)
        .where(AppTestScript.created_by == user_id)
    )

    if project_id:
        query = query.where(AppTestScript.project_id == project_id)
        count_query = count_query.where(AppTestScript.project_id == project_id)
    if platform:
        query = query.where(AppTestScript.platform == platform)
        count_query = count_query.where(AppTestScript.platform == platform)

    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    query = query.order_by(AppTestScript.updated_at.desc())
    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    items = list(result.scalars().all())

    return AppScriptPage(
        items=[AppScriptResponse.model_validate(s) for s in items],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=math.ceil(total / page_size) if total > 0 else 0,
    )


@router.post("/scripts", response_model=AppScriptResponse, status_code=status.HTTP_201_CREATED)
async def create_app_script(
    script_data: AppScriptCreate,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.创建)),
):
    """创建 App 自动化脚本"""
    user_id = 当前用户["用户ID"]
    script = AppTestScript(
        project_id=script_data.project_id,
        name=script_data.name,
        platform=script_data.platform,
        code=script_data.code,
        config=script_data.config,
        created_by=user_id,
    )
    db.add(script)
    await db.commit()
    await db.refresh(script)
    return script


@router.put("/scripts/{script_id}", response_model=AppScriptResponse)
async def update_app_script(
    script_id: int,
    script_data: AppScriptUpdate,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.更新)),
):
    """更新 App 自动化脚本"""
    user_id = 当前用户["用户ID"]
    result = await db.execute(
        select(AppTestScript).where(
            AppTestScript.id == script_id, AppTestScript.created_by == user_id
        )
    )
    script = result.scalar_one_or_none()
    if not script:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="脚本不存在")

    update_data = script_data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(script, key, value)

    await db.commit()
    await db.refresh(script)
    return script


@router.delete("/scripts/{script_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_app_script(
    script_id: int,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.删除)),
):
    """删除 App 自动化脚本"""
    user_id = 当前用户["用户ID"]
    result = await db.execute(
        select(AppTestScript).where(
            AppTestScript.id == script_id, AppTestScript.created_by == user_id
        )
    )
    script = result.scalar_one_or_none()
    if not script:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="脚本不存在")

    await db.delete(script)
    await db.commit()


@router.post("/scripts/{script_id}/run", status_code=status.HTTP_200_OK)
async def run_app_script(
    script_id: int,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.创建)),
):
    """Mock 执行 App 自动化脚本"""
    user_id = 当前用户["用户ID"]
    result = await db.execute(
        select(AppTestScript).where(
            AppTestScript.id == script_id, AppTestScript.created_by == user_id
        )
    )
    script = result.scalar_one_or_none()
    if not script:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="脚本不存在")

    return {
        "script_id": script_id,
        "status": "running",
        "message": f"脚本 '{script.name}' 已提交执行",
    }


# ==================== 设备管理 ====================


@router.get("/devices", response_model=DevicePage)
async def list_devices(
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页数量"),
    platform: str | None = Query(None, description="按平台筛选 (ios/android)"),
    status: str | None = Query(None, description="按状态筛选"),
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.读取)),
):
    """获取测试设备列表（分页，支持筛选）"""
    query = select(TestDevice)
    count_query = select(func.count()).select_from(TestDevice)

    if platform:
        query = query.where(TestDevice.platform == platform)
        count_query = count_query.where(TestDevice.platform == platform)
    if status:
        query = query.where(TestDevice.status == status)
        count_query = count_query.where(TestDevice.status == status)

    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    query = query.order_by(TestDevice.created_at.desc())
    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    items = list(result.scalars().all())

    return DevicePage(
        items=[DeviceResponse.model_validate(d) for d in items],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=math.ceil(total / page_size) if total > 0 else 0,
    )


@router.post("/devices", response_model=DeviceResponse, status_code=status.HTTP_201_CREATED)
async def create_device(
    device_data: DeviceCreate,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.创建)),
):
    """创建测试设备"""
    device = TestDevice(
        name=device_data.name,
        platform=device_data.platform,
        udid=device_data.udid,
        config=device_data.config,
    )
    db.add(device)
    await db.commit()
    await db.refresh(device)
    return device


@router.put("/devices/{device_id}", response_model=DeviceResponse)
async def update_device(
    device_id: int,
    device_data: DeviceUpdate,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.更新)),
):
    """更新测试设备信息"""
    result = await db.execute(select(TestDevice).where(TestDevice.id == device_id))
    device = result.scalar_one_or_none()
    if not device:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="设备不存在")

    update_data = device_data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(device, key, value)

    await db.commit()
    await db.refresh(device)
    return device


@router.delete("/devices/{device_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_device(
    device_id: int,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.删除)),
):
    """删除测试设备"""
    result = await db.execute(select(TestDevice).where(TestDevice.id == device_id))
    device = result.scalar_one_or_none()
    if not device:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="设备不存在")

    await db.delete(device)
    await db.commit()
