"""API 冒烟测试环境：临时 SQLite + 无密钥离线模式（须在导入 app 之前设置环境变量）"""

import os
import pathlib

_TMP_DB = pathlib.Path(__file__).parent / ".smoke_test.db"
os.environ["DATABASE_URL"] = f"sqlite:///{_TMP_DB}"
os.environ["LLM_PROVIDER"] = os.environ.get("LLM_PROVIDER", "mimo")
for k in (
    "OPENAI_API_KEY",
    "ANTHROPIC_API_KEY",
    "MIMO_API_KEY",
    "AGNES_API_KEY",
    "CUSTOM_MODEL_API_KEY",
):
    os.environ[k] = ""  # 显式清空，确保不读取本机 .env 密钥

for suffix in ("", "-journal", "-wal", "-shm"):
    p = pathlib.Path(str(_TMP_DB) + suffix)
    if p.exists():
        p.unlink()
