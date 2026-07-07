"""FastAPI 应用入口"""
import json
import os
import uvicorn
from contextlib import asynccontextmanager
from datetime import datetime

# CrewAI Agent 初始化需要 OPENAI_API_KEY 环境变量（即使不使用 OpenAI），
# 在应用启动前设置占位值，避免 CrewAI 内部校验报错
if not os.environ.get("OPENAI_API_KEY"):
    os.environ["OPENAI_API_KEY"] = "sk-crewai-placeholder"

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.database import Base, engine, migrate_database, SessionLocal
from app.config import settings
from app.routers import generate, novel, export, chat, prompts, model_config
from app.models import novel as _novel_model
from app.models import generation_record as _gen_record_model
from app.models.prompt_template import PromptTemplate
from app.models.model_config import ModelConfig
from app.services.prompts import (
    SYSTEM_PROMPT_PARSE_V1,
    SYSTEM_PROMPT_OUTLINE_V1,
    SYSTEM_PROMPT_CHAPTER_V1,
    SYSTEM_PROMPT_TITLE_V1,
)

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
INDEX_PATH = os.path.join(PROJECT_ROOT, "novels_index.json")
NOVEL_DIR = os.path.join(PROJECT_ROOT, "doc", "novel")


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
                db.add(PromptTemplate(name=name, label=label, content=content, version="v1"))
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

        print(f"[启动重建] DB 为空，从 novels_index.json 恢复 {len(novels_data)} 部小说...", flush=True)

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
                completed_chapters=gen.get("completed_chapters", len(n.get("chapters", []))),
                total_chapters=gen.get("total_chapters", len(n.get("chapters", []))),
                status=gen.get("status", "completed"),
                content_sofar=(n.get("content", "") or "")[:50000],
                chapter_states=json.dumps(gen.get("chapter_states", []), ensure_ascii=False),
                thinking_logs=json.dumps(gen.get("thinking_logs", []), ensure_ascii=False),
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
    migrate_database()
    Base.metadata.create_all(bind=engine)
    rebuild_db_if_empty()
    seed_prompt_templates()
    yield


app = FastAPI(title="番茄小说生成智能体", version="1.1.0", lifespan=lifespan)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由
app.include_router(generate.router)
app.include_router(novel.router)
app.include_router(export.router)
app.include_router(chat.router)
app.include_router(prompts.router)
app.include_router(model_config.router)


@app.get("/")
async def root():
    return {"message": "番茄小说生成智能体 API v1.1", "status": "running"}


@app.get("/health")
async def health():
    return {"status": "ok"}


if __name__ == "__main__":
    uvicorn.run("app.main:app", host=settings.host, port=settings.port, reload=True)
