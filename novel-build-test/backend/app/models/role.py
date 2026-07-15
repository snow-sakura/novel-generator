"""角色模型 — 系统角色定义"""

from sqlalchemy import Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models.base import TimestampMixin


class Role(TimestampMixin, Base):
    """角色表

    属性说明：
        id: 主键自增
        name: 角色名称
        code: 角色编码（唯一）
        description: 角色描述
        menu_permissions: 菜单权限（JSON数组）
        data_scope: 数据权限范围（all/project/self）
    """

    __tablename__ = "roles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(50), nullable=False, comment="角色名称")
    code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, comment="角色编码")
    description: Mapped[str | None] = mapped_column(Text, nullable=True, comment="角色描述")
    menu_permissions: Mapped[str | None] = mapped_column(Text, nullable=True, comment="菜单权限(JSON)")
    data_scope: Mapped[str] = mapped_column(String(20), default="self", comment="数据范围: all/project/self")

    def __repr__(self) -> str:
        return f"<Role id={self.id} name={self.name} code={self.code}>"
