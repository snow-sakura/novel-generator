"""安全测试路由 — 安全扫描任务的 CRUD、运行与结果查询"""

import logging

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.test_modules import SecurityScan
from app.schemas.base import Page, page_from_query
from app.schemas.test_modules import (
    SecurityScanCreate,
    SecurityScanResponse,
)
from app.utils.rbac import 操作, 检查权限

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/test-security", tags=["安全测试"])


@router.get("/scans", response_model=Page[SecurityScanResponse])
async def list_security_scans(
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页数量"),
    project_id: int | None = Query(None, description="按项目筛选"),
    status: str | None = Query(None, description="按状态筛选"),
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.读取)),
):
    """获取安全扫描任务列表（分页，支持按项目和状态筛选）"""
    user_id = 当前用户["用户ID"]

    base_query = select(SecurityScan).where(SecurityScan.created_by == user_id)
    count_base = select(func.count()).select_from(SecurityScan).where(SecurityScan.created_by == user_id)

    if project_id is not None:
        base_query = base_query.where(SecurityScan.project_id == project_id)
        count_base = count_base.where(SecurityScan.project_id == project_id)
    if status is not None:
        base_query = base_query.where(SecurityScan.status == status)
        count_base = count_base.where(SecurityScan.status == status)

    total = (await db.execute(count_base)).scalar() or 0

    query = base_query.order_by(SecurityScan.updated_at.desc()).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    items = list(result.scalars().all())

    return page_from_query(SecurityScanResponse, items, total, page, page_size)


@router.post("/scans", response_model=SecurityScanResponse, status_code=status.HTTP_201_CREATED)
async def create_security_scan(
    data: SecurityScanCreate,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.创建)),
):
    """创建安全扫描任务"""
    user_id = 当前用户["用户ID"]
    scan = SecurityScan(
        project_id=data.project_id,
        name=data.name,
        target_url=data.target_url,
        scan_type=data.scan_type,
        created_by=user_id,
    )
    db.add(scan)
    await db.commit()
    await db.refresh(scan)
    return scan


@router.get("/scans/{scan_id}", response_model=SecurityScanResponse)
async def get_security_scan(
    scan_id: int,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.读取)),
):
    """获取安全扫描任务详情"""
    user_id = 当前用户["用户ID"]
    result = await db.execute(
        select(SecurityScan).where(SecurityScan.id == scan_id, SecurityScan.created_by == user_id)
    )
    scan = result.scalar_one_or_none()
    if not scan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="扫描任务不存在")
    return scan


@router.delete("/scans/{scan_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_security_scan(
    scan_id: int,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.删除)),
):
    """删除安全扫描任务"""
    user_id = 当前用户["用户ID"]
    result = await db.execute(
        select(SecurityScan).where(SecurityScan.id == scan_id, SecurityScan.created_by == user_id)
    )
    scan = result.scalar_one_or_none()
    if not scan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="扫描任务不存在")

    await db.delete(scan)
    await db.commit()


@router.post("/scans/{scan_id}/run", response_model=SecurityScanResponse)
async def run_security_scan(
    scan_id: int,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.更新)),
):
    """模拟运行安全扫描任务（将状态设为 running）"""
    user_id = 当前用户["用户ID"]
    result = await db.execute(
        select(SecurityScan).where(SecurityScan.id == scan_id, SecurityScan.created_by == user_id)
    )
    scan = result.scalar_one_or_none()
    if not scan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="扫描任务不存在")

    scan.status = "running"
    await db.commit()
    await db.refresh(scan)
    return scan


class SecurityScanResult(BaseModel):
    """扫描结果响应"""

    scan_id: int
    status: str = "completed"
    vulnerabilities: list = Field(default_factory=list)
    summary: str = "模拟扫描完成，未发现高危漏洞。"


@router.get("/scans/{scan_id}/result")
async def get_security_scan_result(
    scan_id: int,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.读取)),
):
    """获取模拟的安全扫描结果"""
    user_id = 当前用户["用户ID"]
    result = await db.execute(
        select(SecurityScan).where(SecurityScan.id == scan_id, SecurityScan.created_by == user_id)
    )
    scan = result.scalar_one_or_none()
    if not scan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="扫描任务不存在")

    return SecurityScanResult(
        scan_id=scan.id,
        status=scan.status if scan.status != "running" else "running",
        vulnerabilities=[
            {"type": "XSS", "severity": "medium", "url": scan.target_url},
            {"type": "SQL注入", "severity": "high", "url": f"{scan.target_url}/search"},
        ],
        summary="模拟扫描发现 2 个潜在风险。",
    )
