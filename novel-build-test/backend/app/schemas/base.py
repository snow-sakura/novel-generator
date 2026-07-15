"""公共 Pydantic 模型 — 泛型分页、通用响应等"""

import math

from pydantic import BaseModel, Field
from pydantic import model_validator


class Page[T](BaseModel):
    """泛型分页响应

    替代所有重复的 XXXPage 类，统一分页结构。

    用法:
        # 替代 ProjectPage:
        Page[ProjectResponse]

        # 在路由中:
        @router.get("", response_model=Page[ProjectResponse])

    Args:
        T: 列表中的元素类型（如 ProjectResponse, UserResponse 等）
    """

    items: list[T]
    total: int
    page: int = Field(ge=1)
    page_size: int = Field(ge=1, le=100)
    total_pages: int

    @model_validator(mode="before")
    @classmethod
    def compute_total_pages(cls, data: dict) -> dict:
        """自动计算 total_pages（如果未提供）"""
        if "total_pages" not in data or data["total_pages"] is None:
            total = data.get("total", 0)
            page_size = data.get("page_size", 1)
            data["total_pages"] = math.ceil(total / page_size) if total > 0 else 0
        return data


def page_from_query[T](
    model_class: type,
    items: list,
    total: int,
    page: int,
    page_size: int,
) -> Page[T]:
    """从数据库查询结果构造分页响应

    替代 ExecutionPage.from_query / ReportPage.from_query 等类方法。

    Args:
        model_class: Pydantic 响应模型类（如 ExecutionResponse）
        items: SQLAlchemy 模型实例列表
        total: 总记录数
        page: 当前页码
        page_size: 每页大小

    Returns:
        Page[T] 分页响应
    """
    return Page[T](
        items=[model_class.model_validate(e) for e in items],
        total=total,
        page=page,
        page_size=page_size,
    )
