"""用户模型 — 平台用户账户信息"""

from sqlalchemy import Boolean, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.base import TimestampMixin


class User(TimestampMixin, Base):
    """用户表

    属性说明：
        id: 主键自增
        username: 用户名（唯一）
        email: 邮箱（唯一）
        hashed_password: bcrypt 哈希后的密码
        display_name: 显示昵称
        role: 角色（admin / engineer / viewer）
        is_active: 是否激活
        created_at: 创建时间
        updated_at: 最后更新时间
    """

    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    username: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, comment="用户名")
    email: Mapped[str] = mapped_column(String(120), unique=True, nullable=False, comment="邮箱")
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False, comment="密码哈希")
    display_name: Mapped[str] = mapped_column(String(100), nullable=True, comment="显示名称")
    role: Mapped[str] = mapped_column(String(20), default="engineer", comment="角色: admin/engineer/viewer")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, comment="是否激活")

    # 关联
    projects = relationship("Project", back_populates="owner")

    def __repr__(self) -> str:
        return f"<User id={self.id} username={self.username}>"
