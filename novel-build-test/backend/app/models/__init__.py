"""模型导入 — 确保所有模型被 SQLAlchemy 元数据注册"""

from app.models.agent import AgentDebateRecord, AgentExecution
from app.models.asset import TestAsset
from app.models.audit_log import AuditLog
from app.models.environment import TestEnvironment
from app.models.knowledge import KnowledgeDoc
from app.models.project import Project
from app.models.requirement import Requirement
from app.models.role import Role
from app.models.setting import Setting
from app.models.test_execution import TestExecution
from app.models.test_report import TestReport
from app.models.user import User

__all__ = [
    "AgentDebateRecord",
    "AgentExecution",
    "AuditLog",
    "KnowledgeDoc",
    "Project",
    "Requirement",
    "Role",
    "Setting",
    "TestAsset",
    "TestEnvironment",
    "TestExecution",
    "TestReport",
    "User",
]
