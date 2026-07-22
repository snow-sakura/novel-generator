"""智能体基类 — 所有 Agent 的抽象基类

提供以下核心能力：
- LangGraph 状态管理集成
- 短期/长期记忆（_memory 列表）
- LLM 调用封装（多 Provider 支持）
- 工具调用框架（知识检索、事件发布）
- 自省/反思机制（_reflect）
- 自动重试与降级

所有具体 Agent 必须继承 AgentBase 并实现 execute 方法。
"""

import logging
from abc import ABC, abstractmethod
from datetime import datetime
from typing import Any

from app.services.llm import LLMResult, get_provider

logger = logging.getLogger(__name__)


class AgentResult:
    """智能体执行结果的数据封装

    记录每次 Agent 调用的输出、消耗和元数据，
    用于上下游传递和成本核算。
    """

    def __init__(
        self,
        status: str = "completed",
        output_content: str = "",
        model_used: str = "",
        prompt_tokens: int = 0,
        completion_tokens: int = 0,
        cost_yuan: float = 0.0,
        metadata: dict | None = None,
        agent_name: str = "",
    ):
        self.status = status
        self.output_content = output_content
        self.model_used = model_used
        self.prompt_tokens = prompt_tokens
        self.completion_tokens = completion_tokens
        self.cost_yuan = cost_yuan
        self.metadata = metadata or {}
        self.agent_name = agent_name

    def to_dict(self) -> dict:
        """将结果序列化为字典，便于日志记录和事件发布。"""
        return {
            "agent_name": self.agent_name,
            "status": self.status,
            "output_content": self.output_content,
            "model_used": self.model_used,
            "prompt_tokens": self.prompt_tokens,
            "completion_tokens": self.completion_tokens,
            "cost_yuan": self.cost_yuan,
            "metadata": self.metadata,
        }


class AgentBase(ABC):
    """所有智能体的抽象基类。

    职责：
    - 管理 LLM Provider 生命周期
    - 提供执行历史记录与成本追踪
    - 封装自省、重试、事件发布等横切关注点

    子类只需实现 execute(context) -> AgentResult 方法。
    """

    def __init__(
        self,
        name: str,
        model: str = "deepseek-v4-flash",
        role_description: str = "",
        system_prompt: str = "",
    ):
        """初始化智能体。

        Args:
            name: 智能体名称（如 "RequirementsAnalyst"）。
            model: 模型名称，默认 "deepseek-v4-flash"。
            role_description: 角色描述，用于提示词构建。
            system_prompt: 系统级提示词，随每次 LLM 调用发送。
        """
        self.name = name
        self.model = model
        self.role_description = role_description
        self.system_prompt = system_prompt

        # LLM Provider 实例（由工厂延迟创建）
        self._llm_provider = get_provider(model)

        # 执行历史与成本追踪
        self._execution_history: list[dict] = []
        self._total_cost: float = 0.0

        # 短期记忆（对话/任务上下文）
        self._memory: list[dict] = []

        # 反思计数器
        self._reflection_count: int = 0

        if self._llm_provider is None:
            logger.warning(
                "Agent '%s': 模型 '%s' 的 Provider 不可用（API Key 未配置？）",
                self.name,
                self.model,
            )

    # ==================== LLM 调用封装 ====================

    async def _call_llm(
        self,
        prompt: str,
        temperature: float = 0.7,
        max_tokens: int = 4096,
    ) -> LLMResult:
        """调用底层 LLM Provider 并记录执行历史。

        Args:
            prompt: 发送给模型的提示文本。
            temperature: 采样温度，控制随机性。
            max_tokens: 最大输出 token 数。

        Returns:
            LLMResult 对象，包含生成内容与用量统计。

        Raises:
            RuntimeError: Provider 不可用时抛出。
        """
        if self._llm_provider is None:
            raise RuntimeError(f"Agent '{self.name}': LLM Provider 不可用，请检查模型 '{self.model}' 的 API Key 配置。")

        # 构造消息列表（system + user）
        messages = []
        if self.system_prompt:
            messages.append({"role": "system", "content": self.system_prompt})
        messages.append({"role": "user", "content": prompt})

        # 调用 Provider 的 chat 接口
        result: LLMResult = await self._llm_provider.chat(
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
        )

        # 记录执行历史
        entry = {
            "timestamp": datetime.now().isoformat(),
            "model": result.model_name,
            "prompt_tokens": result.usage.prompt_tokens,
            "completion_tokens": result.usage.completion_tokens,
            "cost_yuan": result.usage.cost_yuan,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }
        self._execution_history.append(entry)
        self._total_cost += result.usage.cost_yuan

        logger.debug(
            "Agent '%s' LLM 调用完成: model=%s, prompt_tokens=%d, completion_tokens=%d, cost=%.6f 元",
            self.name,
            result.model_name,
            result.usage.prompt_tokens,
            result.usage.completion_tokens,
            result.usage.cost_yuan,
        )

        return result

    # ==================== 自省与反思 ====================

    async def _reflect(self, result: LLMResult, context: dict) -> str | None:
        """对 LLM 输出进行简单反思，判断是否需要改进。

        检查输出中是否包含常见错误指示词，若发现问题
        则返回改进建议字符串；否则返回 None 表示合格。

        Args:
            result: 本次 LLM 调用的结果。
            context: 当前执行上下文（可含目标、约束等）。

        Returns:
            改进建议文本，或 None（无需改进）。
        """
        content = result.content.strip().lower()

        # 常见错误指示模式
        error_indicators = [
            "抱歉",
            "我不能",
            "无法完成",
            "error",
            "exception",
            "缺乏信息",
            "insufficient",
            "undefined",
            "not implemented",
        ]

        for indicator in error_indicators:
            if indicator in content:
                suggestion = (
                    f"检测到可能的错误或拒绝回应（关键词: '{indicator}'）。"
                    f"建议重新表述提示词，提供更明确的上下文或分步引导。"
                )
                self._reflection_count += 1
                logger.info(
                    "Agent '%s' 反思触发 (第 %d 次): %s",
                    self.name,
                    self._reflection_count,
                    suggestion,
                )
                return suggestion

        # 检查输出是否过短（可能是不完整的回答）
        if len(result.content) < 20:
            suggestion = (
                f"输出内容过短（仅 {len(result.content)} 字符），"
                f"可能未完整回答问题，建议增加 max_tokens 或引导详细输出。"
            )
            self._reflection_count += 1
            logger.info("Agent '%s' 反思触发 (第 %d 次): %s", self.name, self._reflection_count, suggestion)
            return suggestion

        return None

    # ==================== 知识检索 ====================

    async def _search_knowledge(
        self,
        query: str,
        collection: str = "test_case_knowledge",
        limit: int = 3,
    ) -> list[dict]:
        """从向量知识库检索与查询相关的上下文片段。

        Args:
            query: 检索查询文本。
            collection: 知识库集合名称，默认为 test_case_knowledge。
            limit: 返回结果数量上限。

        Returns:
            检索结果列表，每个元素为包含文档字段的字典。
            检索失败时返回空列表。
        """
        try:
            from app.rag_pipeline.retriever import global_context_retriever

            results = await global_context_retriever.retrieve_context(
                query=query,
                collection_name=collection,
                limit=limit,
            )
            logger.info(
                "Agent '%s' 知识检索完成: query='%s', collection='%s', results=%d",
                self.name,
                query[:50],
                collection,
                len(results),
            )
            return results
        except ImportError as e:
            logger.warning(
                "Agent '%s' 知识检索模块不可用: %s",
                self.name,
                e,
            )
            return []
        except Exception as e:
            logger.error(
                "Agent '%s' 知识检索失败: %s",
                self.name,
                e,
            )
            return []

    # ==================== 事件发布 ====================

    async def _publish_event(self, event_type: str, data: dict):
        """发布事件到事件总线，供其他系统组件订阅消费。

        事件发布采用异步 fire-and-forget 模式，
        发布失败不影响主流程。

        Args:
            event_type: 事件类型标识（如 "agent.execution_started"）。
            data: 事件负载数据。
        """
        try:
            from app.event_bus.producer import global_producer

            payload = {
                "event_type": event_type,
                "agent_name": self.name,
                "timestamp": datetime.now().isoformat(),
                "data": data,
            }
            await global_producer.publish(
                channel="agent_events",
                event=payload,
            )
            logger.debug(
                "Agent '%s' 事件已发布: type=%s",
                self.name,
                event_type,
            )
        except ImportError as e:
            logger.warning(
                "Agent '%s' 事件总线不可用: %s",
                self.name,
                e,
            )
        except Exception as e:
            logger.error(
                "Agent '%s' 事件发布失败: %s",
                self.name,
                e,
            )

    # ==================== 记忆管理 ====================

    async def _save_to_memory(self, key: str, value: Any):
        """将键值对保存到 Agent 的短期记忆中。

        记忆按时间顺序追加，可通过 _load_from_memory 按键检索。

        Args:
            key: 记忆键名。
            value: 记忆内容（任意可序列化类型）。
        """
        entry = {
            "role": "memory",
            "key": key,
            "content": value,
            "timestamp": datetime.now().isoformat(),
        }
        self._memory.append(entry)
        logger.debug(
            "Agent '%s' 记忆已保存: key='%s' (共 %d 条)",
            self.name,
            key,
            len(self._memory),
        )

    async def _load_from_memory(self, key: str) -> Any | None:
        """从短期记忆中按键加载最近一次保存的内容。

        Args:
            key: 要检索的记忆键名。

        Returns:
            最近匹配的记忆内容，未找到时返回 None。
        """
        for entry in reversed(self._memory):
            if entry.get("key") == key:
                logger.debug(
                    "Agent '%s' 记忆已加载: key='%s'",
                    self.name,
                    key,
                )
                return entry["content"]
        logger.debug(
            "Agent '%s' 未找到记忆: key='%s'",
            self.name,
            key,
        )
        return None

    # ==================== 带重试的执行 ====================

    async def _execute_with_retry(
        self,
        prompt: str,
        max_retries: int = 3,
        temperature: float = 0.7,
    ) -> LLMResult:
        """带自省重试机制的 LLM 调用。

        每次调用后执行 _reflect，若反思返回改进建议，
        则将建议追加到 prompt 后重新调用，最多重试 max_retries 次。

        Args:
            prompt: 发送给模型的提示文本。
            max_retries: 最大重试次数（含首次调用）。
            temperature: 采样温度。

        Returns:
            最后一次（或改进后）的 LLMResult。
        """
        current_prompt = prompt
        last_result: LLMResult | None = None

        for attempt in range(max_retries):
            logger.info(
                "Agent '%s' 执行重试第 %d/%d 次",
                self.name,
                attempt + 1,
                max_retries,
            )

            result = await self._call_llm(
                prompt=current_prompt,
                temperature=temperature,
            )
            last_result = result

            # 执行反思
            context = {"attempt": attempt, "max_retries": max_retries}
            suggestion = await self._reflect(result, context)

            if suggestion is None:
                # 反思通过，直接返回
                logger.info(
                    "Agent '%s' 第 %d 次调用通过反思",
                    self.name,
                    attempt + 1,
                )
                return result

            if attempt < max_retries - 1:
                # 还有重试次数：将改进建议追加到 prompt
                current_prompt = (
                    f"{current_prompt}\n\n"
                    f"--- 反思反馈（第 {attempt + 1} 次）---\n"
                    f"{suggestion}\n\n"
                    f"请根据以上反馈改进你的回答。"
                )
                logger.info(
                    "Agent '%s' 第 %d 次调用未通过反思，准备重试",
                    self.name,
                    attempt + 1,
                )
            else:
                logger.warning(
                    "Agent '%s' 已耗尽 %d 次重试次数，返回最后一次结果",
                    self.name,
                    max_retries,
                )

        # 所有重试耗尽，返回最后一次结果
        return last_result  # type: ignore[return-value]

    # ==================== 结果构造辅助 ====================

    def _build_result(
        self,
        output: str = "",
        error: str = "",
        metadata: dict | None = None,
        status: str = "completed",
    ) -> AgentResult:
        """构造 AgentResult（子类辅助方法）

        Args:
            output: 输出内容
            error: 错误信息（若有）
            metadata: 附加元数据
            status: 执行状态

        Returns:
            构造好的 AgentResult 实例
        """
        merged_metadata = dict(metadata or {})
        if error:
            merged_metadata["error"] = error
            status = "failed"
        return AgentResult(
            status=status,
            output_content=output,
            model_used=self.model,
            prompt_tokens=0,
            completion_tokens=0,
            cost_yuan=0.0,
            metadata=merged_metadata,
            agent_name=self.name,
        )

    # ==================== 子类必须实现 ====================

    @abstractmethod
    async def execute(self, context: dict) -> AgentResult:
        """执行智能体的核心逻辑。

        每个 Agent 子类必须实现此方法，根据 context 中的
        输入信息执行任务，并返回 AgentResult。

        Args:
            context: 执行上下文，包含项目信息和上游输出。

        Returns:
            AgentResult 包含执行结果和消耗统计。
        """
        ...

    # ==================== 公共入口 ====================

    async def run(self, context: dict) -> AgentResult:
        """Agent 的公共执行入口。

        封装了事件发布、异常捕获和结果记录等横切逻辑。
        子类不应重写此方法；应实现 execute(context) 方法。

        Args:
            context: 执行上下文。

        Returns:
            AgentResult 包含最终的执行结果和消耗统计。
        """
        # 发布执行开始事件
        await self._publish_event(
            "agent.execution_started",
            {"context_keys": list(context.keys()), "model": self.model},
        )

        try:
            # 执行子类核心逻辑
            result: AgentResult = await self.execute(context)

            # 确保 Agent 名称被记录
            result.agent_name = self.name

            # 发布执行成功事件
            await self._publish_event(
                "agent.execution_completed",
                {
                    "status": result.status,
                    "model_used": result.model_used,
                    "cost_yuan": result.cost_yuan,
                    "prompt_tokens": result.prompt_tokens,
                    "completion_tokens": result.completion_tokens,
                },
            )

            logger.info(
                "Agent '%s' 执行完成: status=%s, cost=%.6f 元",
                self.name,
                result.status,
                result.cost_yuan,
            )
            return result

        except Exception as e:
            logger.exception(
                "Agent '%s' 执行异常: %s",
                self.name,
                e,
            )

            # 发布执行失败事件
            await self._publish_event(
                "agent.execution_failed",
                {"error": str(e), "error_type": type(e).__name__},
            )

            # 返回失败结果
            return AgentResult(
                status="failed",
                output_content=f"执行异常: {e}",
                agent_name=self.name,
                metadata={"error": str(e), "error_type": type(e).__name__},
            )
