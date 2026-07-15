"""异步测试执行器 — 在后台运行测试脚本并实时更新状态

3.1.6: 使用 asyncio.subprocess 在后台执行测试脚本，
通过 Redis 事件总线推送状态变化，支持取消和日志收集。
"""

import asyncio
import datetime
import json
import logging
import os
import time
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import async_session
from app.event_bus.event_types import (
    EventPayload,
    TestEvent,
    TEST_EXECUTION_STARTED,
    TEST_EXECUTION_COMPLETED,
    TEST_EXECUTION_FAILED,
)
from app.event_bus.producer import global_producer
from app.models.test_execution import TestExecution

logger = logging.getLogger(__name__)

# 内存中的执行日志缓冲区 {execution_id: [log_line, ...]}
_execution_logs: dict[int, list[str]] = {}

# 取消信号集
_cancelled_executions: set[int] = set()

# 正在运行的任务
_running_tasks: dict[int, asyncio.Task] = {}


async def _update_execution_status(
    execution_id: int,
    status: str,
    error_message: Optional[str] = None,
    summary: Optional[dict] = None,
) -> None:
    """更新数据库中执行记录的状态。"""
    try:
        async with async_session() as db:
            result = await db.execute(
                select(TestExecution).where(TestExecution.id == execution_id)
            )
            execution = result.scalar_one_or_none()
            if not execution:
                logger.error(f"执行记录不存在: id={execution_id}")
                return

            execution.status = status
            if status in ("completed", "failed", "cancelled"):
                execution.completed_at = datetime.datetime.now(datetime.UTC)
            if error_message:
                execution.error_message = error_message
            if summary:
                execution.summary = summary

            await db.commit()
            logger.info(f"执行状态已更新: id={execution_id} status={status}")
    except Exception as e:
        logger.exception(f"更新执行状态失败: {e}")


async def _publish_execution_event(
    event_type: str,
    execution_id: int,
    status: str,
    duration_ms: Optional[float] = None,
) -> None:
    """通过 Redis 事件总线发布执行状态事件。"""
    try:
        payload = EventPayload(
            event_type=event_type,
            source="executor",
            data={"execution_id": execution_id, "status": status},
        )
        event = TestEvent(
            payload=payload,
            test_case_id=str(execution_id),
            status=status,
            duration_ms=duration_ms,
        )
        await global_producer.publish("test:executions", event)
    except Exception as e:
        logger.warning(f"发布执行事件失败: {e}")


def _append_log(execution_id: int, message: str) -> None:
    """追加日志到内存缓冲区。"""
    if execution_id not in _execution_logs:
        _execution_logs[execution_id] = []
    timestamp = datetime.datetime.now().isoformat()
    _execution_logs[execution_id].append(f"[{timestamp}] {message}")


async def _run_test_cases(execution_id: int, test_script: str) -> dict:
    """运行测试脚本并收集结果。

    Args:
        execution_id: 执行记录 ID
        test_script: 要执行的测试脚本路径或命令

    Returns:
        包含测试结果的摘要字典
    """
    _append_log(execution_id, f"启动测试: {test_script}")

    total_cases = 0
    passed = 0
    failed = 0
    skipped = 0

    # 检查是否是 Python 脚本路径
    if test_script.endswith(".py"):
        cmd = ["python", test_script]
    else:
        # 否则视为 shell 命令
        cmd = ["sh", "-c", test_script]

    try:
        process = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )

        # 逐行读取输出（非阻塞）
        async def read_stream(stream, is_error: bool = False) -> None:
            nonlocal total_cases, passed, failed, skipped
            while True:
                line = await stream.readline()
                if not line:
                    break
                line_text = line.decode("utf-8", errors="replace").rstrip()
                _append_log(execution_id, line_text)

                # 检查是否在取消状态
                if execution_id in _cancelled_executions:
                    process.terminate()
                    _append_log(execution_id, "⚠️ 执行已被取消")
                    return

                # 尝试从输出中解析测试结果标记
                # 支持格式: TEST_RESULT: {name} {status} {duration_ms}
                if line_text.startswith("TEST_RESULT:"):
                    try:
                        parts = line_text[len("TEST_RESULT:"):].strip().split()
                        if len(parts) >= 2:
                            total_cases += 1
                            status = parts[1].lower()
                            if status in ("pass", "passed"):
                                passed += 1
                            elif status in ("fail", "failed", "error"):
                                failed += 1
                            elif status in ("skip", "skipped"):
                                skipped += 1
                    except (ValueError, IndexError):
                        pass

        # 并行读取 stdout 和 stderr
        await asyncio.gather(
            read_stream(process.stdout),
            read_stream(process.stderr, is_error=True),
        )

        exit_code = await process.wait()

        if execution_id in _cancelled_executions:
            status_text = "cancelled"
        elif exit_code == 0:
            status_text = "completed"
        else:
            status_text = "failed"

        # 如果没有解析到任何用例，使用 exit_code 做推断
        if total_cases == 0:
            total_cases = 1
            if exit_code == 0:
                passed = 1
            else:
                failed = 1

        summary = {
            "total_cases": total_cases,
            "passed": passed,
            "failed": failed,
            "skipped": skipped,
            "exit_code": exit_code,
            "script": test_script,
        }

        _append_log(execution_id, f"执行完成: status={status_text} exit={exit_code}")

        return summary

    except asyncio.CancelledError:
        _append_log(execution_id, "⚠️ 执行任务被取消")
        return {"total_cases": 0, "passed": 0, "failed": 0, "skipped": 0,
                "exit_code": -1, "script": test_script}
    except FileNotFoundError:
        error_msg = f"测试脚本不存在: {test_script}"
        _append_log(execution_id, f"❌ {error_msg}")
        return {"total_cases": 0, "passed": 0, "failed": 1, "skipped": 0,
                "exit_code": -1, "error": error_msg, "script": test_script}
    except Exception as e:
        error_msg = f"执行异常: {e}"
        _append_log(execution_id, f"❌ {error_msg}")
        logger.exception(f"执行异常: execution_id={execution_id}")
        return {"total_cases": 0, "passed": 0, "failed": 1, "skipped": 0,
                "exit_code": -1, "error": str(e), "script": test_script}


async def execute_test(
    execution_id: int,
    test_script: str = "",
) -> None:
    """执行测试的主入口 — 在后台运行测试并更新状态。

    此函数在后台 asyncio.Task 中运行，不会阻塞调用方。
    它会更新执行状态、收集日志、并通过事件总线推送。

    Args:
        execution_id: 执行记录 ID
        test_script: 要运行的测试脚本路径或命令
    """
    start_time = time.time()

    try:
        # 更新状态为 running
        _append_log(execution_id, "正在初始化执行环境...")
        await _update_execution_status(execution_id, "running")
        await _publish_execution_event(
            TEST_EXECUTION_STARTED, execution_id, "running"
        )
        _append_log(execution_id, "✅ 状态已更新为 running")

        # 执行测试
        if test_script:
            summary = await _run_test_cases(execution_id, test_script)
        else:
            # 无脚本时的模拟执行
            _append_log(execution_id, "未指定测试脚本，执行模拟测试...")
            await asyncio.sleep(1)
            _append_log(execution_id, "模拟测试通过 (1/1)")
            summary = {
                "total_cases": 1,
                "passed": 1,
                "failed": 0,
                "skipped": 0,
                "exit_code": 0,
                "script": "",
            }

        # 计算耗时
        duration_ms = int((time.time() - start_time) * 1000)
        summary["duration_ms"] = duration_ms

        # 判断最终状态
        if execution_id in _cancelled_executions:
            final_status = "cancelled"
        elif summary.get("failed", 0) > 0 or summary.get("exit_code", 0) != 0:
            final_status = "failed"
        else:
            final_status = "completed"

        # 更新最终状态
        await _update_execution_status(execution_id, final_status, summary=summary)
        await _publish_execution_event(
            TEST_EXECUTION_COMPLETED if final_status == "completed"
            else TEST_EXECUTION_FAILED,
            execution_id,
            final_status,
            duration_ms=float(duration_ms),
        )

        _append_log(execution_id, f"🏁 执行结束: {final_status} ({duration_ms}ms)")

    except Exception as e:
        logger.exception(f"执行过程异常: execution_id={execution_id}")
        await _update_execution_status(execution_id, "failed", error_message=str(e))
        await _publish_execution_event(
            TEST_EXECUTION_FAILED, execution_id, "failed"
        )
        _append_log(execution_id, f"❌ 执行异常: {e}")
    finally:
        # 清理
        _cancelled_executions.discard(execution_id)
        _running_tasks.pop(execution_id, None)


def start_execution(
    execution_id: int,
    test_script: str = "",
) -> asyncio.Task:
    """启动后台异步执行任务。

    Args:
        execution_id: 执行记录 ID
        test_script: 测试脚本路径或命令

    Returns:
        后台 asyncio.Task 对象
    """
    task = asyncio.create_task(execute_test(execution_id, test_script))
    _running_tasks[execution_id] = task
    logger.info(f"后台执行已启动: id={execution_id}")
    return task


async def cancel_execution(execution_id: int) -> bool:
    """取消正在运行的执行。

    Args:
        execution_id: 执行记录 ID

    Returns:
        是否成功取消
    """
    _cancelled_executions.add(execution_id)

    task = _running_tasks.get(execution_id)
    if task and not task.done():
        task.cancel()
        logger.info(f"执行已取消: id={execution_id}")
        return True

    logger.warning(f"执行未在运行: id={execution_id}")
    return False


def get_execution_logs(execution_id: int) -> list[str]:
    """获取执行的实时日志。

    Args:
        execution_id: 执行记录 ID

    Returns:
        日志行列表
    """
    return _execution_logs.get(execution_id, [])


def get_execution_status(execution_id: int) -> str:
    """获取执行的实时运行状态。

    Args:
        execution_id: 执行记录 ID

    Returns:
        状态描述: "running" / "cancelling" / "not_found" / "done"
    """
    if execution_id in _cancelled_executions:
        return "cancelling"
    task = _running_tasks.get(execution_id)
    if task and not task.done():
        return "running"
    return "done" if execution_id in _execution_logs else "not_found"
