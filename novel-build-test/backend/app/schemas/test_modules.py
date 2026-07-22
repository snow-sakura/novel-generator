"""AI 测试模块 Pydantic 模型 — 8 大测试类型 + 测试数据配置"""

import datetime

from pydantic import BaseModel, Field

from app.schemas.base import Page

# ==================== 1. 功能测试 ====================


class FunctionalCaseCreate(BaseModel):
    project_id: int = Field(..., ge=1)
    module: str | None = Field(None, max_length=100)
    title: str = Field(..., min_length=1, max_length=300)
    precondition: str | None = None
    steps: str = "[]"
    expected: str | None = None
    priority: str = "medium"


class FunctionalCaseUpdate(BaseModel):
    module: str | None = None
    title: str | None = None
    precondition: str | None = None
    steps: str | None = None
    expected: str | None = None
    priority: str | None = None
    status: str | None = None


class FunctionalCaseResponse(BaseModel):
    id: int
    project_id: int
    module: str | None = None
    title: str
    precondition: str | None = None
    steps: str = "[]"
    expected: str | None = None
    priority: str = "medium"
    status: str = "draft"
    created_by: int | None = None
    created_at: datetime.datetime | None = None
    updated_at: datetime.datetime | None = None
    model_config = {"from_attributes": True}


FunctionalCasePage = Page[FunctionalCaseResponse]


# ==================== 2. 接口测试 ====================


class ApiTestCaseCreate(BaseModel):
    project_id: int = Field(..., ge=1)
    name: str = Field(..., min_length=1, max_length=200)
    method: str = Field(..., pattern="^(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)$")
    url: str = Field(..., min_length=1, max_length=500)
    headers: str | None = None
    body: str | None = None
    assertions: str | None = None
    schedule: str | None = None
    is_auto: bool = False


class ApiTestCaseUpdate(BaseModel):
    name: str | None = None
    method: str | None = None
    url: str | None = None
    headers: str | None = None
    body: str | None = None
    assertions: str | None = None
    schedule: str | None = None
    is_auto: bool | None = None
    status: str | None = None


class ApiTestCaseResponse(BaseModel):
    id: int
    project_id: int
    name: str
    method: str
    url: str
    headers: str | None = None
    body: str | None = None
    assertions: str | None = None
    schedule: str | None = None
    is_auto: bool = False
    status: str = "active"
    created_by: int | None = None
    created_at: datetime.datetime | None = None
    updated_at: datetime.datetime | None = None
    model_config = {"from_attributes": True}


ApiTestCasePage = Page[ApiTestCaseResponse]


# ==================== 3. Web 自动化 ====================


class WebScriptCreate(BaseModel):
    project_id: int = Field(..., ge=1)
    name: str = Field(..., min_length=1, max_length=200)
    description: str | None = None
    code: str = Field(..., min_length=1)
    framework: str = "playwright"
    config: str | None = None


class WebScriptUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    code: str | None = None
    framework: str | None = None
    config: str | None = None
    status: str | None = None


class WebScriptResponse(BaseModel):
    id: int
    project_id: int
    name: str
    description: str | None = None
    code: str
    framework: str = "playwright"
    config: str | None = None
    status: str = "active"
    created_by: int | None = None
    created_at: datetime.datetime | None = None
    updated_at: datetime.datetime | None = None
    model_config = {"from_attributes": True}


WebScriptPage = Page[WebScriptResponse]


# ==================== 4. App 自动化 ====================


class AppScriptCreate(BaseModel):
    project_id: int = Field(..., ge=1)
    name: str = Field(..., min_length=1, max_length=200)
    platform: str = Field(..., pattern="^(ios|android)$")
    code: str = Field(..., min_length=1)
    config: str | None = None


class AppScriptUpdate(BaseModel):
    name: str | None = None
    platform: str | None = None
    code: str | None = None
    config: str | None = None
    status: str | None = None


class AppScriptResponse(BaseModel):
    id: int
    project_id: int
    name: str
    platform: str
    code: str
    config: str | None = None
    status: str = "active"
    created_by: int | None = None
    created_at: datetime.datetime | None = None
    updated_at: datetime.datetime | None = None
    model_config = {"from_attributes": True}


AppScriptPage = Page[AppScriptResponse]


class DeviceCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    platform: str = Field(..., pattern="^(ios|android)$")
    udid: str | None = None
    config: str | None = None


class DeviceUpdate(BaseModel):
    name: str | None = None
    platform: str | None = None
    udid: str | None = None
    status: str | None = None
    config: str | None = None


class DeviceResponse(BaseModel):
    id: int
    name: str
    platform: str
    udid: str | None = None
    status: str = "available"
    config: str | None = None
    created_at: datetime.datetime | None = None
    model_config = {"from_attributes": True}


DevicePage = Page[DeviceResponse]


# ==================== 5. 性能测试 ====================


class PerfScriptCreate(BaseModel):
    project_id: int = Field(..., ge=1)
    name: str = Field(..., min_length=1, max_length=200)
    test_type: str = Field(..., pattern="^(jmeter|k6)$")
    config: str = Field(..., min_length=1)


class PerfScriptUpdate(BaseModel):
    name: str | None = None
    test_type: str | None = None
    config: str | None = None
    status: str | None = None


class PerfScriptResponse(BaseModel):
    id: int
    project_id: int
    name: str
    test_type: str
    config: str
    status: str = "active"
    created_by: int | None = None
    created_at: datetime.datetime | None = None
    updated_at: datetime.datetime | None = None
    model_config = {"from_attributes": True}


PerfScriptPage = Page[PerfScriptResponse]


class PerfMonitorResponse(BaseModel):
    id: int
    script_id: int
    concurrent: int = 0
    tps: float = 0.0
    response_time: float = 0.0
    error_rate: float = 0.0
    created_at: datetime.datetime | None = None
    model_config = {"from_attributes": True}


PerfMonitorPage = Page[PerfMonitorResponse]


# ==================== 6. 安全测试 ====================


class SecurityScanCreate(BaseModel):
    project_id: int = Field(..., ge=1)
    name: str = Field(..., min_length=1, max_length=200)
    target_url: str = Field(..., min_length=1, max_length=500)
    scan_type: str = "owasp"


class SecurityScanUpdate(BaseModel):
    name: str | None = None
    target_url: str | None = None
    scan_type: str | None = None
    status: str | None = None


class SecurityScanResponse(BaseModel):
    id: int
    project_id: int
    name: str
    target_url: str
    scan_type: str = "owasp"
    status: str = "pending"
    summary: str | None = None
    created_by: int | None = None
    created_at: datetime.datetime | None = None
    updated_at: datetime.datetime | None = None
    model_config = {"from_attributes": True}


SecurityScanPage = Page[SecurityScanResponse]


# ==================== 7. UI 测试 ====================


class VisualBaselineCreate(BaseModel):
    project_id: int = Field(..., ge=1)
    name: str = Field(..., min_length=1, max_length=200)
    screenshot_url: str = Field(..., min_length=1, max_length=500)
    viewport: str | None = None
    diff_threshold: float = 0.01


class VisualBaselineResponse(BaseModel):
    id: int
    project_id: int
    name: str
    screenshot_url: str
    viewport: str | None = None
    diff_threshold: float = 0.01
    created_by: int | None = None
    created_at: datetime.datetime | None = None
    model_config = {"from_attributes": True}


VisualBaselinePage = Page[VisualBaselineResponse]


# ==================== 8. 冒烟测试 ====================


class SmokeSuiteCreate(BaseModel):
    project_id: int = Field(..., ge=1)
    name: str = Field(..., min_length=1, max_length=200)
    description: str | None = None
    test_cases: str = "[]"
    auto_trigger: bool = False
    trigger_config: str | None = None


class SmokeSuiteUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    test_cases: str | None = None
    auto_trigger: bool | None = None
    trigger_config: str | None = None
    status: str | None = None


class SmokeSuiteResponse(BaseModel):
    id: int
    project_id: int
    name: str
    description: str | None = None
    test_cases: str = "[]"
    auto_trigger: bool = False
    trigger_config: str | None = None
    status: str = "active"
    created_by: int | None = None
    created_at: datetime.datetime | None = None
    updated_at: datetime.datetime | None = None
    model_config = {"from_attributes": True}


SmokeSuitePage = Page[SmokeSuiteResponse]


# ==================== 9. 测试数据配置 ====================


class DataSourceCreate(BaseModel):
    project_id: int = Field(..., ge=1)
    name: str = Field(..., min_length=1, max_length=100)
    source_type: str = Field(..., pattern="^(database|csv|api|mock)$")
    config: str = Field(..., min_length=1)


class DataSourceUpdate(BaseModel):
    name: str | None = None
    source_type: str | None = None
    config: str | None = None
    status: str | None = None


class DataSourceResponse(BaseModel):
    id: int
    project_id: int
    name: str
    source_type: str
    config: str
    status: str = "active"
    created_at: datetime.datetime | None = None
    updated_at: datetime.datetime | None = None
    model_config = {"from_attributes": True}


DataSourcePage = Page[DataSourceResponse]


class MaskingRuleCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    field_pattern: str = Field(..., min_length=1, max_length=200)
    strategy: str = Field(..., min_length=1, max_length=50)
    config: str | None = None


class MaskingRuleUpdate(BaseModel):
    name: str | None = None
    field_pattern: str | None = None
    strategy: str | None = None
    config: str | None = None


class MaskingRuleResponse(BaseModel):
    id: int
    name: str
    field_pattern: str
    strategy: str
    config: str | None = None
    created_at: datetime.datetime | None = None
    model_config = {"from_attributes": True}


MaskingRulePage = Page[MaskingRuleResponse]


class MockServiceCreate(BaseModel):
    project_id: int = Field(..., ge=1)
    name: str = Field(..., min_length=1, max_length=100)
    config: str = Field(..., min_length=1)


class MockServiceUpdate(BaseModel):
    name: str | None = None
    config: str | None = None
    status: str | None = None


class MockServiceResponse(BaseModel):
    id: int
    project_id: int
    name: str
    config: str
    status: str = "active"
    created_at: datetime.datetime | None = None
    updated_at: datetime.datetime | None = None
    model_config = {"from_attributes": True}


MockServicePage = Page[MockServiceResponse]
