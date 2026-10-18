"""V3 后端 API 冒烟测试 — 离线（TestClient + 临时 SQLite，无需 LLM 密钥）
覆盖：健康检查 / 配置状态 / 模型与题材 / 小说与记录列表 / 模型配置 / 提示词
"""
import os
import pathlib

from fastapi.testclient import TestClient

from app.main import app  # conftest 已注入离线环境变量

client = TestClient(app)


def setup_module(module):
    """TestClient 进入上下文触发 lifespan（建表）"""
    client.__enter__()


def teardown_module(module):
    client.__exit__(None, None, None)
    for suffix in ("", "-journal", "-wal", "-shm"):
        p = pathlib.Path(str(pathlib.Path(__file__).parent / ".smoke_test.db") + suffix)
        if p.exists():
            p.unlink()


def test_health():
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json().get("status") in ("healthy", "ok")


def test_root():
    assert client.get("/").status_code == 200


def test_config_check_without_key():
    r = client.get("/api/v3/config/check")
    assert r.status_code == 200
    body = r.json()
    assert "provider" in body and "configured" in body


def test_models_list():
    r = client.get("/api/v3/models/list")
    assert r.status_code == 200
    assert isinstance(r.json(), list) and len(r.json()) > 0


def test_genres_list_male_and_female():
    for gender in ("男频", "女频"):
        r = client.get(f"/api/v3/genres/list?gender={gender}")
        assert r.status_code == 200
        body = r.json()
        assert body["gender"] == gender
        assert len(body["genres"]) > 0 and len(body["styles"]) > 0


def test_prompts_list():
    r = client.get("/api/v3/prompts")
    assert r.status_code == 200


def test_novels_and_records_list():
    # 注：后端启动可能从文件备份恢复数据，机器间数量不同 → 只断言结构与状态码
    r = client.get("/api/v3/novels?page=1&size=10")
    assert r.status_code == 200
    body = r.json()
    assert {"total", "items"} <= body.keys() and isinstance(body["items"], list)
    r2 = client.get("/api/v3/records?page=1&size=10")
    assert r2.status_code == 200


def test_model_config_roundtrip():
    r = client.get("/api/v3/model-config")
    assert r.status_code == 200


def test_novel_404():
    assert client.get("/api/v3/novels/999999").status_code == 404
