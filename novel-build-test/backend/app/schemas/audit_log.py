"""审计日志相关 Pydantic 模型 — 响应"""

import datetime

from pydantic import BaseModel, Field


class AuditLogResponse(BaseModel):
    """审计日志信息响应"""

    id: int
    entity_type: str
    entity_id: int
    action: str
    source: str
    actor_id: int | None
    actor_name: str | None
    changes: dict | None
    ai_metadata: dict | None
    ip_address: str | None
    created_at: datetime.datetime

    model_config = {"from_attributes": True}


class AuditLogPage(BaseModel):
    """审计日志分页响应"""

    items: list[AuditLogResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
