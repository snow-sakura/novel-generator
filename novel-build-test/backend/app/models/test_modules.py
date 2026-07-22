"""AI 测试模块模型群 — 8 大测试类型 + 测试数据配置

包含: 功能测试、接口测试、Web自动化、App自动化、性能测试、
      安全测试、UI测试、冒烟测试、测试数据配置
"""

from sqlalchemy import Boolean, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models.base import TimestampMixin

# ==================== 1. 功能测试 (test-functional) ====================


class FunctionalTestCase(TimestampMixin, Base):
    """功能测试用例表"""

    __tablename__ = "functional_test_cases"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    project_id: Mapped[int] = mapped_column(Integer, ForeignKey("projects.id"), nullable=False)
    module: Mapped[str | None] = mapped_column(String(100), nullable=True, comment="功能模块")
    title: Mapped[str] = mapped_column(String(300), nullable=False, comment="用例标题")
    precondition: Mapped[str | None] = mapped_column(Text, nullable=True, comment="前置条件")
    steps: Mapped[str] = mapped_column(Text, nullable=False, default="[]", comment="测试步骤(JSON)")
    expected: Mapped[str | None] = mapped_column(Text, nullable=True, comment="预期结果")
    priority: Mapped[str] = mapped_column(String(20), default="medium", comment="优先级")
    status: Mapped[str] = mapped_column(String(20), default="draft", comment="状态")
    created_by: Mapped[int | None] = mapped_column(Integer, nullable=True)

    def __repr__(self) -> str:
        return f"<FunctionalTestCase id={self.id} title={self.title}>"


# ==================== 2. 接口测试 (test-api) ====================


class ApiTestCase(TimestampMixin, Base):
    """接口测试用例表"""

    __tablename__ = "api_test_cases"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    project_id: Mapped[int] = mapped_column(Integer, ForeignKey("projects.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False, comment="用例名称")
    method: Mapped[str] = mapped_column(String(10), nullable=False, comment="请求方法")
    url: Mapped[str] = mapped_column(String(500), nullable=False, comment="请求URL")
    headers: Mapped[str | None] = mapped_column(Text, nullable=True, comment="请求头(JSON)")
    body: Mapped[str | None] = mapped_column(Text, nullable=True, comment="请求体(JSON)")
    assertions: Mapped[str | None] = mapped_column(Text, nullable=True, comment="断言规则(JSON)")
    schedule: Mapped[str | None] = mapped_column(String(100), nullable=True, comment="定时表达式")
    is_auto: Mapped[bool] = mapped_column(Boolean, default=False, comment="是否自动化")
    status: Mapped[str] = mapped_column(String(20), default="active")
    created_by: Mapped[int | None] = mapped_column(Integer, nullable=True)

    def __repr__(self) -> str:
        return f"<ApiTestCase id={self.id} name={self.name}>"


# ==================== 3. Web 自动化测试 (test-web-auto) ====================


class WebTestScript(TimestampMixin, Base):
    """Web 自动化测试脚本表"""

    __tablename__ = "web_test_scripts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    project_id: Mapped[int] = mapped_column(Integer, ForeignKey("projects.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False, comment="脚本名称")
    description: Mapped[str | None] = mapped_column(Text, nullable=True, comment="描述")
    code: Mapped[str] = mapped_column(Text, nullable=False, comment="脚本代码")
    framework: Mapped[str] = mapped_column(String(20), default="playwright", comment="框架")
    config: Mapped[str | None] = mapped_column(Text, nullable=True, comment="配置(JSON)")
    status: Mapped[str] = mapped_column(String(20), default="active")
    created_by: Mapped[int | None] = mapped_column(Integer, nullable=True)

    def __repr__(self) -> str:
        return f"<WebTestScript id={self.id} name={self.name}>"


# ==================== 4. App 自动化测试 (test-app-auto) ====================


class AppTestScript(TimestampMixin, Base):
    """App 自动化测试脚本表"""

    __tablename__ = "app_test_scripts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    project_id: Mapped[int] = mapped_column(Integer, ForeignKey("projects.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False, comment="脚本名称")
    platform: Mapped[str] = mapped_column(String(20), nullable=False, comment="平台: ios/android")
    code: Mapped[str] = mapped_column(Text, nullable=False, comment="脚本代码")
    config: Mapped[str | None] = mapped_column(Text, nullable=True, comment="配置(JSON)")
    status: Mapped[str] = mapped_column(String(20), default="active")
    created_by: Mapped[int | None] = mapped_column(Integer, nullable=True)

    def __repr__(self) -> str:
        return f"<AppTestScript id={self.id} name={self.name}>"


class TestDevice(TimestampMixin, Base):
    """测试设备表"""

    __tablename__ = "test_devices"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False, comment="设备名称")
    platform: Mapped[str] = mapped_column(String(20), nullable=False, comment="平台")
    udid: Mapped[str | None] = mapped_column(String(200), nullable=True, comment="设备标识")
    status: Mapped[str] = mapped_column(String(20), default="available", comment="状态")
    config: Mapped[str | None] = mapped_column(Text, nullable=True, comment="配置(JSON)")

    def __repr__(self) -> str:
        return f"<TestDevice id={self.id} name={self.name}>"


# ==================== 5. 性能测试 (test-performance) ====================


class PerfTestScript(TimestampMixin, Base):
    """性能测试脚本表"""

    __tablename__ = "perf_test_scripts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    project_id: Mapped[int] = mapped_column(Integer, ForeignKey("projects.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False, comment="脚本名称")
    test_type: Mapped[str] = mapped_column(String(20), nullable=False, comment="类型: jmeter/k6")
    config: Mapped[str] = mapped_column(Text, nullable=False, comment="压测配置(JSON)")
    status: Mapped[str] = mapped_column(String(20), default="active")
    created_by: Mapped[int | None] = mapped_column(Integer, nullable=True)

    def __repr__(self) -> str:
        return f"<PerfTestScript id={self.id} name={self.name}>"


class PerfMonitorRecord(TimestampMixin, Base):
    """性能监控记录表"""

    __tablename__ = "perf_monitor_records"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    script_id: Mapped[int] = mapped_column(Integer, ForeignKey("perf_test_scripts.id"), nullable=False)
    concurrent: Mapped[int] = mapped_column(Integer, default=0, comment="并发数")
    tps: Mapped[float] = mapped_column(Float, default=0.0, comment="TPS")
    response_time: Mapped[float] = mapped_column(Float, default=0.0, comment="响应时间(ms)")
    error_rate: Mapped[float] = mapped_column(Float, default=0.0, comment="错误率(%)")

    def __repr__(self) -> str:
        return f"<PerfMonitorRecord id={self.id} script_id={self.script_id}>"


# ==================== 6. 安全测试 (test-security) ====================


class SecurityScan(TimestampMixin, Base):
    """安全扫描任务表"""

    __tablename__ = "security_scans"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    project_id: Mapped[int] = mapped_column(Integer, ForeignKey("projects.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False, comment="扫描名称")
    target_url: Mapped[str] = mapped_column(String(500), nullable=False, comment="目标URL")
    scan_type: Mapped[str] = mapped_column(String(50), default="owasp", comment="扫描类型")
    status: Mapped[str] = mapped_column(String(20), default="pending", comment="状态")
    summary: Mapped[str | None] = mapped_column(Text, nullable=True, comment="扫描摘要(JSON)")
    created_by: Mapped[int | None] = mapped_column(Integer, nullable=True)

    def __repr__(self) -> str:
        return f"<SecurityScan id={self.id} name={self.name}>"


# ==================== 7. UI 测试 (test-ui) ====================


class VisualBaseline(TimestampMixin, Base):
    """UI 视觉基线表"""

    __tablename__ = "visual_baselines"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    project_id: Mapped[int] = mapped_column(Integer, ForeignKey("projects.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False, comment="基线名称")
    screenshot_url: Mapped[str] = mapped_column(String(500), nullable=False, comment="截图URL")
    viewport: Mapped[str | None] = mapped_column(String(50), nullable=True, comment="视口尺寸")
    diff_threshold: Mapped[float] = mapped_column(Float, default=0.01, comment="对比阈值")
    created_by: Mapped[int | None] = mapped_column(Integer, nullable=True)

    def __repr__(self) -> str:
        return f"<VisualBaseline id={self.id} name={self.name}>"


# ==================== 8. 冒烟测试 (test-smoke) ====================


class SmokeSuite(TimestampMixin, Base):
    """冒烟测试用例集表"""

    __tablename__ = "smoke_suites"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    project_id: Mapped[int] = mapped_column(Integer, ForeignKey("projects.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False, comment="用例集名称")
    description: Mapped[str | None] = mapped_column(Text, nullable=True, comment="描述")
    test_cases: Mapped[str] = mapped_column(Text, nullable=False, default="[]", comment="关联用例(JSON)")
    auto_trigger: Mapped[bool] = mapped_column(Boolean, default=False, comment="是否自动触发")
    trigger_config: Mapped[str | None] = mapped_column(Text, nullable=True, comment="触发配置(JSON)")
    status: Mapped[str] = mapped_column(String(20), default="active")
    created_by: Mapped[int | None] = mapped_column(Integer, nullable=True)

    def __repr__(self) -> str:
        return f"<SmokeSuite id={self.id} name={self.name}>"


# ==================== 9. 测试数据配置 (test-data) ====================


class DataSource(TimestampMixin, Base):
    """测试数据源配置表"""

    __tablename__ = "data_sources"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    project_id: Mapped[int] = mapped_column(Integer, ForeignKey("projects.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False, comment="数据源名称")
    source_type: Mapped[str] = mapped_column(String(30), nullable=False, comment="类型: database/csv/api/mock")
    config: Mapped[str] = mapped_column(Text, nullable=False, comment="连接配置(JSON)")
    status: Mapped[str] = mapped_column(String(20), default="active")

    def __repr__(self) -> str:
        return f"<DataSource id={self.id} name={self.name}>"


class MaskingRule(TimestampMixin, Base):
    """数据脱敏规则表"""

    __tablename__ = "masking_rules"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False, comment="规则名称")
    field_pattern: Mapped[str] = mapped_column(String(200), nullable=False, comment="字段匹配模式")
    strategy: Mapped[str] = mapped_column(String(50), nullable=False, comment="脱敏策略")
    config: Mapped[str | None] = mapped_column(Text, nullable=True, comment="配置(JSON)")

    def __repr__(self) -> str:
        return f"<MaskingRule id={self.id} name={self.name}>"


class MockService(TimestampMixin, Base):
    """Mock 服务配置表"""

    __tablename__ = "mock_services"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    project_id: Mapped[int] = mapped_column(Integer, ForeignKey("projects.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False, comment="服务名称")
    config: Mapped[str] = mapped_column(Text, nullable=False, comment="Mock配置(JSON)")
    status: Mapped[str] = mapped_column(String(20), default="active")

    def __repr__(self) -> str:
        return f"<MockService id={self.id} name={self.name}>"
