"""
加载项目中的各类文档，包括源代码文件、测试用例文件等。
支持按文件类型匹配批量加载，为后续 RAG 处理提供原始文本数据。
"""

import logging
from pathlib import Path

from app.config import settings

logger = logging.getLogger(__name__)


class DocumentLoader:
    """文档加载器，负责从文件系统和项目目录中加载文档内容。"""

    def __init__(self, base_path: str | None = None) -> None:
        """
        初始化文档加载器。

        Args:
            base_path: 基础路径，如果为 None 则使用 settings 中配置的路径或默认当前目录。
        """
        default_path = getattr(settings, "PROJECT_SOURCE_DIR", None) or "."
        self.base_path = base_path or default_path
        logger.info("DocumentLoader 初始化，base_path=%s", self.base_path)

    async def load_text_file(self, file_path: str) -> dict:
        """
        读取单个文本文件并返回结构化文档字典。

        Args:
            file_path: 目标文件的绝对路径。

        Returns:
            包含以下字段的字典:
                - 文本: 文件内容
                - 来源: 文件路径
                - 类型: 文件扩展名
                - 元数据: 文件相关元信息
        """
        path = Path(file_path)
        if not path.exists():
            logger.warning("文件不存在: %s", file_path)
            return {}

        try:
            content = path.read_text(encoding="utf-8")
            return {
                "文本": content,
                "来源": str(path.resolve()),
                "类型": path.suffix,
                "元数据": {
                    "文件名": path.name,
                    "文件大小": path.stat().st_size,
                    "最后修改时间": path.stat().st_mtime,
                },
            }
        except Exception as e:
            logger.error("读取文件失败 %s: %s", file_path, e)
            return {}

    async def load_directory(self, dir_path: str, pattern: str = "*.py") -> list[dict]:
        """
        遍历指定目录，加载所有匹配模式的文件。

        Args:
            dir_path: 目标目录路径。
            pattern: 文件 glob 匹配模式，默认为 "*.py"。

        Returns:
            文档字典列表，每个元素包含 文本、来源、类型、元数据。
        """
        dir_path_obj = Path(dir_path)
        if not dir_path_obj.exists() or not dir_path_obj.is_dir():
            logger.warning("目录不存在: %s", dir_path)
            return []

        documents: list[dict] = []
        for file_path in sorted(dir_path_obj.rglob(pattern)):
            if file_path.is_file():
                doc = await self.load_text_file(str(file_path))
                if doc:
                    documents.append(doc)

        logger.info(
            "从目录 %s 加载了 %d 个文档（模式: %s）",
            dir_path,
            len(documents),
            pattern,
        )
        return documents

    async def load_project_source(self) -> list[dict]:
        """
        从 settings.PROJECT_SOURCE_DIR 加载项目源代码。
        同时匹配多种常见源文件模式（.py, .md, .txt, .yaml, .yml, .json）。

        Returns:
            文档字典列表。
        """
        patterns = ["*.py", "*.md", "*.txt", "*.yaml", "*.yml", "*.json"]
        all_documents: list[dict] = []
        seen_paths: set[str] = set()

        for pattern in patterns:
            documents = await self.load_directory(self.base_path, pattern=pattern)
            for doc in documents:
                source = doc.get("来源", "")
                if source and source not in seen_paths:
                    seen_paths.add(source)
                    all_documents.append(doc)

        logger.info(
            "项目源码加载完成，共 %d 个文档（去重后）",
            len(all_documents),
        )
        return all_documents
