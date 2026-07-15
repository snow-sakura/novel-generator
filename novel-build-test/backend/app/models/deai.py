"""去AI味配置模型 — 语言风格、领域术语、输出模板、词频黑名单"""

from sqlalchemy import Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models.base import TimestampMixin


class DeaiConfig(TimestampMixin, Base):
    """去AI味全局配置表（单行配置）"""

    __tablename__ = "deai_configs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    style: Mapped[str] = mapped_column(String(20), default="neutral", comment="风格: formal/casual/neutral")
    variety: Mapped[str | None] = mapped_column(Text, nullable=True, comment="句式多样性配置(JSON)")
    humanize: Mapped[str | None] = mapped_column(Text, nullable=True, comment="人性化配置(JSON)")
    intensity: Mapped[str] = mapped_column(String(20), default="medium", comment="强度: off/light/medium/heavy")


class DeaiTerm(TimestampMixin, Base):
    """领域术语表"""

    __tablename__ = "deai_terms"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    term: Mapped[str] = mapped_column(String(200), nullable=False, comment="术语")
    replacement: Mapped[str | None] = mapped_column(String(200), nullable=True, comment="替换词")
    category: Mapped[str | None] = mapped_column(String(50), nullable=True, comment="分类")

    def __repr__(self) -> str:
        return f"<DeaiTerm id={self.id} term={self.term}>"


class DeaiOutputTemplate(TimestampMixin, Base):
    """输出模板表"""

    __tablename__ = "deai_output_templates"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False, comment="模板名称")
    pattern: Mapped[str] = mapped_column(Text, nullable=False, comment="模板模式")
    description: Mapped[str | None] = mapped_column(String(500), nullable=True, comment="描述")

    def __repr__(self) -> str:
        return f"<DeaiOutputTemplate id={self.id} name={self.name}>"


class DeaiBlacklist(TimestampMixin, Base):
    """词频黑名单表"""

    __tablename__ = "deai_blacklists"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    word: Mapped[str] = mapped_column(String(200), unique=True, nullable=False, comment="禁用词")
    replacement: Mapped[str | None] = mapped_column(String(200), nullable=True, comment="替换词")

    def __repr__(self) -> str:
        return f"<DeaiBlacklist id={self.id} word={self.word}>"
