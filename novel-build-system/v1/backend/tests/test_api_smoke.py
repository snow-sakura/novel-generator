"""V1 后端 API 冒烟测试 — 离线（TestClient + 临时 SQLite，无需 LLM 密钥）
覆盖：健康检查 / 配置状态 / 模型与题材 / 小说与记录列表 / 模型配置
"""

import pathlib

from fastapi.testclient import TestClient

from app.main import app  # conftest 已注入离线环境变量

client = TestClient(app)


def setup_module(module):
    client.__enter__()  # 触发 lifespan 建表


def teardown_module(module):
    client.__exit__(None, None, None)
    for suffix in ("", "-journal", "-wal", "-shm"):
        p = pathlib.Path(str(pathlib.Path(__file__).parent / ".smoke_test.db") + suffix)
        if p.exists():
            p.unlink()


def test_health():
    r = client.get("/health")
    assert r.status_code == 200


def test_config_check_without_key():
    r = client.get("/api/v1/config/check")
    assert r.status_code == 200
    assert "provider" in r.json()


def test_models_list():
    r = client.get("/api/v1/models/list")
    assert r.status_code == 200


def test_genres_list():
    r = client.get("/api/v1/genres/list?gender=男频")
    assert r.status_code == 200
    body = r.json()
    assert body["gender"] == "男频" and len(body["genres"]) > 0


def test_novels_and_records_list():
    # 注：后端启动会从 docs/novel 文件备份恢复数据，不同机器数量不同 → 只断言结构与状态码
    r = client.get("/api/v1/novels?page=1&size=10")
    assert r.status_code == 200
    body = r.json()
    assert {"total", "items"} <= body.keys() and isinstance(body["items"], list)
    assert client.get("/api/v1/records?page=1&size=10").status_code == 200


def test_model_config():
    r = client.get("/api/v1/model-config")
    assert r.status_code == 200


def test_novel_404():
    assert client.get("/api/v1/novels/999999").status_code == 404
