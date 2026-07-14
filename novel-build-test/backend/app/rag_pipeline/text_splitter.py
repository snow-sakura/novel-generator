"""
文本分割处理器，将长文档按语义边界切割为合适大小的文本块。
支持自定义分隔符、块大小和重叠区域，确保上下文连贯性。
"""

import logging
import re
from typing import Optional

logger = logging.getLogger(__name__)


class TextSplitter:
    """文本分割器，将长文本按照智能策略切分成指定大小的文本块。"""

    def __init__(
        self,
        chunk_size: int = 512,
        chunk_overlap: int = 64,
        separators: Optional[list[str]] = None,
    ) -> None:
        """
        初始化文本分割器。

        Args:
            chunk_size: 每个文本块的目标字符数。
            chunk_overlap: 相邻块之间的重叠字符数，用于保持上下文连贯。
            separators: 分隔符优先级列表，按优先顺序尝试。
        """
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        self.separators = separators or ["\n\n", "\n", "。", "；", "，", " "]

        if self.chunk_overlap >= self.chunk_size:
            self.chunk_overlap = self.chunk_size // 4
            logger.warning(
                "chunk_overlap (%d) 超过 chunk_size (%d)，已自动调整为 %d",
                chunk_overlap,
                chunk_size,
                self.chunk_overlap,
            )

    def _find_split_position(self, text: str, start: int, end: int) -> int:
        """
        在 [start, end] 区间内寻找最佳分割位置。

        策略：按分隔符优先级从高到低查找，优先使用靠近 end 的分隔符。

        Args:
            text: 原始文本。
            start: 搜索起始位置。
            end: 搜索结束位置（目标切分点）。

        Returns:
            最佳分割位置，如果找不到则返回 end。
        """
        # 从 end 开始向前搜索，优先找靠近 end 的高优先级分隔符
        search_start = max(start, end - self.chunk_size // 2)
        search_end = end

        for separator in self.separators:
            # 在搜索区间内从右向左查找分隔符
            pos = text.rfind(separator, search_start, search_end)
            if pos != -1:
                split_pos = pos + len(separator)
                logger.debug("找到分隔符 '%s'，分割位置: %d", separator, split_pos)
                return split_pos

        # 没有找到任何分隔符，尝试在 end 附近找任何非中文字符的边界
        for offset in range(self.chunk_size // 4):
            check_pos = end - offset
            if check_pos > start and check_pos < len(text):
                char = text[check_pos]
                # 如果是空格、制表符或换行符
                if char in " \t\n\r":
                    return check_pos + 1

        # 实在找不到，就在 end 位置强制切分
        logger.debug("未找到合适分隔符，在位置 %d 强制切分", end)
        return end

    def split_text(self, text: str) -> list[str]:
        """
        将文本分割成多个文本块。

        Args:
            text: 待分割的原始文本。

        Returns:
            文本块列表。
        """
        if not text:
            return []

        if len(text) <= self.chunk_size:
            return [text]

        chunks: list[str] = []
        start = 0
        text_len = len(text)

        while start < text_len:
            # 计算当前块的结束位置
            end = min(start + self.chunk_size, text_len)

            if end == text_len:
                # 最后一块
                chunks.append(text[start:end])
                break

            # 寻找最佳切分位置
            split_pos = self._find_split_position(text, start, end)

            chunk = text[start:split_pos].strip()
            if chunk:
                chunks.append(chunk)

            # 计算下一块的起始位置（带重叠）
            start = split_pos - self.chunk_overlap
            if start < 0:
                start = 0

            # 防止死循环：如果切分位置没有前进，强制推进
            if start >= split_pos:
                start = split_pos
                logger.debug("防止死循环，强制推进 start 到 %d", start)

        logger.info("文本分割完成: %d 字符 -> %d 个块", text_len, len(chunks))
        return chunks

    def split_documents(self, documents: list[dict]) -> list[dict]:
        """
        将一批文档按文本字段分割为更小的块。

        每个输入文档应包含 文本、来源、类型、元数据 字段。
        输出列表中的每个块文档将继承来源、类型和元数据。

        Args:
            documents: 文档字典列表，每个字典须包含 "文本" 键。

        Returns:
            分割后的文档块字典列表。
        """
        chunk_documents: list[dict] = []

        for doc in documents:
            text = doc.get("文本", "")
            if not text:
                continue

            chunks = self.split_text(text)
            for i, chunk_text in enumerate(chunks):
                chunk_doc = {
                    "文本": chunk_text,
                    "来源": doc.get("来源", ""),
                    "类型": doc.get("类型", ""),
                    "元数据": dict(doc.get("元数据", {})),
                }
                # 在元数据中记录块索引
                chunk_doc["元数据"]["块索引"] = i
                chunk_doc["元数据"]["块总数"] = len(chunks)
                chunk_documents.append(chunk_doc)

        logger.info(
            "文档分割完成: %d 个文档 -> %d 个块",
            len(documents),
            len(chunk_documents),
        )
        return chunk_documents
