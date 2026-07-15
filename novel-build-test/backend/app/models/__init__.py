"""模型导入 — 确保所有模型被 SQLAlchemy 元数据注册"""

from app.models.user import User
from app.models.role import Role
from app.models.project import Project
from app.models.audit_log import AuditLog
from app.models.agent import AgentExecution, AgentDebateRecord
from app.models.requirement import Requirement
from app.models.environment import TestEnvironment
from app.models.asset import TestAsset
from app.models.knowledge import KnowledgeDoc
from app.models.setting import Setting
from app.models.test_execution import TestExecution
from app.models.test_report import TestReport

__all__ = [
    "User",
    "Role",
    "Project",
    "AuditLog",
    "AgentExecution",
    "AgentDebateRecord",
    "Requirement",
    "TestEnvironment",
    "TestAsset",
    "KnowledgeDoc",
    "Setting",
    "TestExecution",
    "TestReport",
]
