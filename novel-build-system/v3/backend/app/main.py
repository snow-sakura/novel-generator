"""FastAPI 应用入口"""

import json
import os
import traceback
import uvicorn
from contextlib import asynccontextmanager
from datetime import datetime, timedelta

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

from app.database import Base, engine, migrate_database, SessionLocal
from app.config import settings
from app.routers import (
    generate,
    novel,
    export,
    chat,
    prompts,
    model_config,
    refine,
    dialogue,
    assist,
    illustration,
    analysis,
    tts,
    quotes,
)
from app.routers import test as test_router
from app.models import novel as _novel_model
from app.models import generation_record as _gen_record_model
from app.models import paragraph_version as _paragraph_version_model
from app.models.prompt_template import PromptTemplate
from app.models.model_config import ModelConfig
from app.services.prompts import (
    SYSTEM_PROMPT_PARSE_V1,
    SYSTEM_PROMPT_OUTLINE_V1,
    SYSTEM_PROMPT_CHAPTER_V1,
    SYSTEM_PROMPT_TITLE_V1,
)

PROJECT_ROOT = os.path.dirname(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
)
INDEX_PATH = os.path.join(PROJECT_ROOT, "novels_index.json")
NOVEL_DIR = os.path.join(PROJECT_ROOT, "..", "docs", "novel")


def seed_prompt_templates():
    """启动时将当前 prompts 备份到 prompt_templates 表（原始模板参考）"""
    templates = [
        ("parse", "要素解析 Prompt（原始版）", SYSTEM_PROMPT_PARSE_V1),
        ("outline", "大纲规划 Prompt（原始版）", SYSTEM_PROMPT_OUTLINE_V1),
        ("chapter", "逐章写作 Prompt（原始版）", SYSTEM_PROMPT_CHAPTER_V1),
        ("title", "标题生成 Prompt（原始版）", SYSTEM_PROMPT_TITLE_V1),
    ]
    db = SessionLocal()
    try:
        existing = {t.name for t in db.query(PromptTemplate).all()}
        for name, label, content in templates:
            if name not in existing:
                db.add(
                    PromptTemplate(
                        name=name, label=label, content=content, version="v1"
                    )
                )
        db.commit()
        print(f"[启动] Prompt 模板已备份 ({len(templates)} 个)", flush=True)
    finally:
        db.close()


def rebuild_db_if_empty():
    """启动时检测 DB 为空 → 从 novels_index.json 重建"""
    db = SessionLocal()
    try:
        count = db.query(_novel_model.Novel).count()
        if count > 0:
            return

        if not os.path.exists(INDEX_PATH):
            return

        with open(INDEX_PATH, "r", encoding="utf-8") as f:
            index = json.load(f)

        novels_data = index.get("novels", [])
        if not novels_data:
            return

        print(
            f"[启动重建] DB 为空，从 novels_index.json 恢复 {len(novels_data)} 部小说...",
            flush=True,
        )

        for n in novels_data:
            novel = _novel_model.Novel(
                title=n.get("title", "未命名小说"),
                seed_text=n.get("seed_text", "（从 index 恢复）"),
                gender=n.get("gender", "男频"),
                genre=n.get("genre", "都市脑洞"),
                style=n.get("style", "轻松搞笑"),
                word_count=n.get("word_count", 3000),
                per_chapter_min=n.get("per_chapter_min", 800),
                per_chapter_max=n.get("per_chapter_max", 2500),
                actual_count=n.get("actual_count", 0),
                content=n.get("content", ""),
                chapters=json.dumps(n.get("chapters", []), ensure_ascii=False),
                outline=json.dumps(n.get("outline", {}), ensure_ascii=False),
                model_used=n.get("model_used", "unknown"),
                model_config=json.dumps(n.get("model_config", {}), ensure_ascii=False),
                time_cost=n.get("time_cost", 0.0),
                created_at=datetime.now(),
            )
            db.add(novel)
            db.flush()

            gen = n.get("generation_record", {})
            record = _gen_record_model.GenerationRecord(
                novel_id=novel.id,
                params=json.dumps(gen.get("params", {}), ensure_ascii=False),
                completed_chapters=gen.get(
                    "completed_chapters", len(n.get("chapters", []))
                ),
                total_chapters=gen.get("total_chapters", len(n.get("chapters", []))),
                status=gen.get("status", "completed"),
                content_sofar=(n.get("content", "") or "")[:50000],
                chapter_states=json.dumps(
                    gen.get("chapter_states", []), ensure_ascii=False
                ),
                thinking_logs=json.dumps(
                    gen.get("thinking_logs", []), ensure_ascii=False
                ),
                seed_text=n.get("seed_text", ""),
                created_at=datetime.now(),
                updated_at=datetime.now(),
            )
            db.add(record)
            print(f"  ✅ 恢复: {n.get('title', '?')} (ID={novel.id})", flush=True)

        db.commit()
        print(f"[启动重建] 共恢复 {len(novels_data)} 部小说", flush=True)
    except Exception as e:
        print(f"[启动重建] 失败: {e}", flush=True)
    finally:
        db.close()


@asynccontextmanager
async def lifespan(application: FastAPI):
    Base.metadata.create_all(bind=engine)
    migrate_database()
    rebuild_db_if_empty()
    seed_prompt_templates()
    yield


app = FastAPI(title="番茄小说生成智能体 V3", version="v3.0.0", lifespan=lifespan)


# ─── 请求体大小限制（10MB）───
class RequestSizeLimitMiddleware(BaseHTTPMiddleware):
    MAX_BODY_SIZE = 10 * 1024 * 1024  # 10MB

    async def dispatch(self, request: Request, call_next):
        content_length = request.headers.get("content-length")
        if content_length and int(content_length) > self.MAX_BODY_SIZE:
            return JSONResponse(
                status_code=413,
                content={"detail": "请求体过大，最大支持 10MB"},
            )
        return await call_next(request)


app.add_middleware(RequestSizeLimitMiddleware)

# ─── CORS — 限制为开发环境域名，生产环境请配置具体域名 ───
ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH"],
    allow_headers=["*"],
)


# ─── 全局异常处理 — 统一错误响应格式 ───
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    print(f"[ERROR] {request.method} {request.url.path}: {exc}", flush=True)
    traceback.print_exc()
    return JSONResponse(
        status_code=500,
        content={"detail": "服务器内部错误", "error": str(exc)},
    )


# ─── 注册路由 ───
app.include_router(generate.router)
app.include_router(novel.router)
app.include_router(export.router)
app.include_router(chat.router)
app.include_router(prompts.router)
app.include_router(model_config.router)
app.include_router(refine.router)
app.include_router(dialogue.router)
app.include_router(assist.router)
app.include_router(illustration.router)
app.include_router(analysis.router)
app.include_router(tts.router)
app.include_router(quotes.router)

# test-lab seed API（仅在 mock 模式下注册）
if os.environ.get("LLM_PROVIDER") == "mock":
    app.include_router(test_router.router)


@app.get("/")
async def root():
    return {
        "message": "番茄小说生成智能体 V3 API",
        "version": "v3.0.0",
        "status": "running",
    }


@app.get("/health")
async def health():
    """增强健康检查：DB 连接 + 记录统计 + 磁盘空间"""
    import shutil
    from app.models.novel import Novel
    from app.models.generation_record import GenerationRecord

    db = SessionLocal()
    try:
        novel_count = db.query(Novel).count()
        record_count = db.query(GenerationRecord).count()
        in_progress = (
            db.query(GenerationRecord)
            .filter(GenerationRecord.status == "in_progress")
            .count()
        )

        # 检查孤立的 in_progress 记录（超过 30 分钟）
        stale_cutoff = datetime.now() - timedelta(minutes=30)
        stale = (
            db.query(GenerationRecord)
            .filter(
                GenerationRecord.status == "in_progress",
                GenerationRecord.updated_at < stale_cutoff,
            )
            .count()
        )

        # 磁盘空间
        novel_dir = os.path.join(PROJECT_ROOT, "..", "docs", "novel")
        disk = shutil.disk_usage(
            novel_dir if os.path.exists(novel_dir) else PROJECT_ROOT
        )

        return {
            "status": "ok",
            "version": "v3.0.0",
            "database": {
                "novels": novel_count,
                "records": record_count,
                "in_progress": in_progress,
                "stale_records": stale,
            },
            "disk": {
                "total_gb": round(disk.total / (1024**3), 1),
                "used_gb": round(disk.used / (1024**3), 1),
                "free_gb": round(disk.free / (1024**3), 1),
            },
        }
    finally:
        db.close()


@app.post("/api/v3/backup")
async def backup_database():
    """备份数据库文件"""
    import shutil

    db_path = settings.database_url.replace("sqlite:///", "")
    if not os.path.exists(db_path):
        raise HTTPException(status_code=404, detail="数据库文件不存在")

    backup_dir = os.path.join(PROJECT_ROOT, "backups")
    os.makedirs(backup_dir, exist_ok=True)

    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_path = os.path.join(backup_dir, f"novel_generator_v3_{ts}.db")
    shutil.copy2(db_path, backup_path)

    # 保留最近 10 个备份
    backups = sorted(
        [f for f in os.listdir(backup_dir) if f.endswith(".db")],
        reverse=True,
    )
    for old in backups[10:]:
        try:
            os.remove(os.path.join(backup_dir, old))
        except Exception:
            pass

    return {
        "status": "ok",
        "backup": backup_path,
        "size_kb": round(os.path.getsize(backup_path) / 1024, 1),
    }


@app.get("/api/v3/health")
async def health_v3():
    """v3 API 健康检查端点"""
    return {"status": "ok"}


@app.get("/api/v3/")
async def root_v3():
    """v3 API 根路径"""
    return {
        "message": "番茄小说生成智能体 V3 API",
        "version": "v3.0.0",
        "status": "running",
    }


if __name__ == "__main__":
    uvicorn.run("app.main:app", host=settings.host, port=settings.port, reload=True)
