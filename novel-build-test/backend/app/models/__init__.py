"""模型导入 — 确保所有模型被 SQLAlchemy 元数据注册"""

from app.models.user import User
from app.models.project import Project
from app.models.audit_log import AuditLog
from app.models.agent import AgentExecution, AgentDebateRecord
from app.models.requirement import Requirement
from app.models.environment import TestEnvironment
from app.models.asset import TestAsset

__all__ = [
    "User",
    "Project",
    "AuditLog",
    "AgentExecution",
    "AgentDebateRecord",
    "Requirement",
    "TestEnvironment",
    "TestAsset",
]
