"""测试资产模型 — AISQA 测试资产库"""

import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class TestAsset(Base):
    """测试资产表

    属性说明：
        id: 主键自增
        project_id: 所属项目 ID
        name: 资产名称
        type: 资产类型（file/script/data/config/image/other）
        tags: 逗号分隔的标签字符串
        file_path: 文件路径
        file_size: 文件大小（字节）
        content: 文本内容（小文件直接存储）
        version: 版本号
        created_by: 创建者用户 ID
        created_at: 创建时间
        updated_at: 更新时间
    """

    __tablename__ = "test_assets"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    project_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("projects.id"), nullable=False, comment="所属项目"
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False, comment="资产名称")
    type: Mapped[str] = mapped_column(
        String(20), default="file",
        comment="资产类型: file/script/data/config/image/other",
    )
    tags: Mapped[str | None] = mapped_column(String(500), nullable=True, comment="逗号分隔标签")
    file_path: Mapped[str | None] = mapped_column(String(500), nullable=True, comment="文件路径")
    file_size: Mapped[int] = mapped_column(Integer, default=0, comment="文件大小（字节）")
    content: Mapped[str | None] = mapped_column(Text, nullable=True, comment="文本内容")
    version: Mapped[int] = mapped_column(Integer, default=1, comment="版本号")
    created_by: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=False, comment="创建者"
    )
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, server_default=func.now(), comment="创建时间"
    )
    updated_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now(), comment="更新时间"
    )

    # 关联
    project = relationship("Project", backref="assets")

    def __repr__(self) -> str:
        return f"<TestAsset id={self.id} name={self.name}>"
