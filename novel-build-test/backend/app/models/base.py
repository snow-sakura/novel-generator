"""模型公共基类 — 提供 TimestampMixin 等通用 Mixin"""

import datetime

from sqlalchemy import DateTime, func
from sqlalchemy.orm import Mapped, mapped_column


class TimestampMixin:
    """自动时间戳 Mixin

    提供 created_at / updated_at 两个通用字段，
    所有业务模型继承此类即可自动获得时间戳，避免重复定义。

    用法:
        class Project(TimestampMixin, Base):
            __tablename__ = "projects"
            ...
    """

    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, server_default=func.now(), comment="创建时间")
    updated_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now(), comment="更新时间"
    )
