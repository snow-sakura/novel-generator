"""Phase 3 模块 Pydantic 模型 — 聊天室、Hermes、Skills、集成"""

import datetime

from pydantic import BaseModel, Field

from app.schemas.base import Page

# ==================== AI 聊天室 ====================


class ChatSessionCreate(BaseModel):
    title: str | None = Field(None, max_length=200)
    model: str | None = "deepseek-v4-flash"


class ChatSessionResponse(BaseModel):
    id: int
    title: str | None = None
    model: str | None = None
    created_by: int | None = None
    created_at: datetime.datetime | None = None
    model_config = {"from_attributes": True}


ChatSessionPage = Page[ChatSessionResponse]


class ChatMessageCreate(BaseModel):
    role: str = Field(..., pattern="^(user|assistant|system)$")
    content: str = Field(..., min_length=1)


class ChatMessageResponse(BaseModel):
    id: int
    session_id: int
    role: str
    content: str
    created_at: datetime.datetime | None = None
    model_config = {"from_attributes": True}


ChatMessagePage = Page[ChatMessageResponse]


# ==================== Hermes ====================


class HermesChannelCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    platform: str = Field(..., pattern="^(telegram|discord|slack|custom)$")
    config: str = Field(..., min_length=1)


class HermesChannelUpdate(BaseModel):
    name: str | None = None
    platform: str | None = None
    config: str | None = None
    is_active: bool | None = None


class HermesChannelResponse(BaseModel):
    id: int
    name: str
    platform: str
    config: str
    is_active: bool = True
    created_at: datetime.datetime | None = None
    updated_at: datetime.datetime | None = None
    model_config = {"from_attributes": True}


HermesChannelPage = Page[HermesChannelResponse]


class HermesPermissionResponse(BaseModel):
    id: int
    request_type: str
    request_data: str
    status: str = "pending"
    responded_by: int | None = None
    responded_at: str | None = None
    created_at: datetime.datetime | None = None
    model_config = {"from_attributes": True}


HermesPermissionPage = Page[HermesPermissionResponse]


class HermesPermissionRespond(BaseModel):
    decision: str = Field(..., pattern="^(approve|deny)$")


# ==================== Skills ====================


class SkillCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    skill_type: str = Field(..., pattern="^(mcp|internal|custom)$")
    description: str | None = None
    config: str = Field(..., min_length=1)


class SkillUpdate(BaseModel):
    name: str | None = None
    skill_type: str | None = None
    description: str | None = None
    config: str | None = None
    is_active: bool | None = None


class SkillResponse(BaseModel):
    id: int
    name: str
    skill_type: str
    description: str | None = None
    config: str
    is_active: bool = True
    created_at: datetime.datetime | None = None
    updated_at: datetime.datetime | None = None
    model_config = {"from_attributes": True}


SkillPage = Page[SkillResponse]


class McpToolCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: str | None = None
    schema_def: str = Field(..., min_length=1)
    endpoint: str | None = None


class McpToolUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    schema_def: str | None = None
    endpoint: str | None = None
    is_active: bool | None = None


class McpToolResponse(BaseModel):
    id: int
    name: str
    description: str | None = None
    schema_def: str
    endpoint: str | None = None
    is_active: bool = True
    created_at: datetime.datetime | None = None
    updated_at: datetime.datetime | None = None
    model_config = {"from_attributes": True}


McpToolPage = Page[McpToolResponse]


class SkillPermissionResponse(BaseModel):
    id: int
    agent_key: str
    skill_id: int
    is_enabled: bool = True
    created_at: datetime.datetime | None = None
    model_config = {"from_attributes": True}


SkillPermissionPage = Page[SkillPermissionResponse]


class SkillPermissionUpdate(BaseModel):
    agent_key: str = Field(..., min_length=1)
    skill_id: int = Field(..., ge=1)
    is_enabled: bool = True


class SkillLogResponse(BaseModel):
    id: int
    skill_id: int
    agent_key: str | None = None
    input_data: str | None = None
    output_data: str | None = None
    duration_ms: int = 0
    status: str = "success"
    created_at: datetime.datetime | None = None
    model_config = {"from_attributes": True}


SkillLogPage = Page[SkillLogResponse]


# ==================== 集成与通知 ====================


class CicdConfigCreate(BaseModel):
    project_id: int = Field(..., ge=1)
    name: str = Field(..., min_length=1, max_length=100)
    ci_type: str = Field(..., pattern="^(jenkins|github|gitlab)$")
    webhook_url: str = Field(..., min_length=1, max_length=500)
    secret: str | None = None
    events: str | None = None


class CicdConfigUpdate(BaseModel):
    name: str | None = None
    ci_type: str | None = None
    webhook_url: str | None = None
    secret: str | None = None
    events: str | None = None
    is_active: bool | None = None


class CicdConfigResponse(BaseModel):
    id: int
    project_id: int
    name: str
    ci_type: str
    webhook_url: str
    secret: str | None = None
    events: str | None = None
    is_active: bool = True
    created_at: datetime.datetime | None = None
    updated_at: datetime.datetime | None = None
    model_config = {"from_attributes": True}


CicdConfigPage = Page[CicdConfigResponse]


class NotificationChannelCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    channel_type: str = Field(..., pattern="^(email|dingtalk|feishu|slack)$")
    config: str = Field(..., min_length=1)


class NotificationChannelUpdate(BaseModel):
    name: str | None = None
    channel_type: str | None = None
    config: str | None = None
    is_active: bool | None = None


class NotificationChannelResponse(BaseModel):
    id: int
    name: str
    channel_type: str
    config: str
    is_active: bool = True
    created_at: datetime.datetime | None = None
    updated_at: datetime.datetime | None = None
    model_config = {"from_attributes": True}


NotificationChannelPage = Page[NotificationChannelResponse]


class ExternalToolCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    tool_type: str = Field(..., pattern="^(jira|git|zentao)$")
    config: str = Field(..., min_length=1)


class ExternalToolUpdate(BaseModel):
    name: str | None = None
    tool_type: str | None = None
    config: str | None = None
    is_active: bool | None = None


class ExternalToolResponse(BaseModel):
    id: int
    name: str
    tool_type: str
    config: str
    is_active: bool = True
    created_at: datetime.datetime | None = None
    updated_at: datetime.datetime | None = None
    model_config = {"from_attributes": True}


ExternalToolPage = Page[ExternalToolResponse]


# ==================== AI 智能体 Agent 专用 API ====================


class AgentAnalyzeRequest(BaseModel):
    project_id: int = Field(..., ge=1)
    input_data: str = Field(..., min_length=1, description="输入内容(需求文档/设计文档等)")


class AgentAnalyzeResponse(BaseModel):
    agent_name: str
    status: str = "completed"
    result: dict = {}


class DebateLaunchRequest(BaseModel):
    topic: str = Field(..., min_length=1)
    pro_side: str = Field(..., min_length=1)
    con_side: str = Field(..., min_length=1)
    max_rounds: int = 3


class DebateRecordResponse(BaseModel):
    id: int
    topic: str
    models: str
    rounds: str | None = None
    consensus: str | None = None
    status: str
    created_by: int | None = None
    created_at: datetime.datetime | None = None
    finished_at: str | None = None
    model_config = {"from_attributes": True}


DebateRecordPage = Page[DebateRecordResponse]


# ==================== AI 数据库调优 ====================


class DbConnectRequest(BaseModel):
    host: str = Field(..., min_length=1)
    port: int = 3306
    username: str = Field(..., min_length=1)
    password: str = ""
    database: str = Field(..., min_length=1)


class DbSlowQueryResponse(BaseModel):
    query: str
    avg_duration_ms: float
    frequency: int
    suggestion: str


class DbIndexSuggestion(BaseModel):
    table: str
    current_indexes: list[str] = []
    suggested_indexes: list[str] = []
    estimated_improvement: str


# ==================== AI 助手 ====================


class QuickAction(BaseModel):
    key: str
    label: str
    icon: str = ""


class AssistantOverview(BaseModel):
    project_count: int = 0
    execution_count: int = 0
    pass_rate: float = 0.0
    recent_activities: list[dict] = []
