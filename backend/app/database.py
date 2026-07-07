import json
from datetime import datetime
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from app.config import settings

engine = create_engine(
    settings.database_url,
    connect_args={"check_same_thread": False},
    echo=False,
)
SessionLocal = sessionmaker(bind=engine, autoflush=False)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def migrate_database():
    """检查并添加数据库中缺失的列（兼容旧表结构升级）"""
    from app.models.novel import Novel
    from app.models.generation_record import GenerationRecord

    db = SessionLocal()
    try:
        inspector = inspect(db.bind)
        tables = inspector.get_table_names()

        if "novels" in tables:
            columns = {c["name"] for c in inspector.get_columns("novels")}
            added = []
            # v1.0 → v1.1 新增列
            if "gender" not in columns:
                db.execute(text("ALTER TABLE novels ADD COLUMN gender VARCHAR(10) DEFAULT '男频'"))
                added.append("gender")
            if "per_chapter_min" not in columns:
                db.execute(text("ALTER TABLE novels ADD COLUMN per_chapter_min INTEGER DEFAULT 800"))
                added.append("per_chapter_min")
            if "per_chapter_max" not in columns:
                db.execute(text("ALTER TABLE novels ADD COLUMN per_chapter_max INTEGER DEFAULT 2500"))
                added.append("per_chapter_max")
            if "outline" not in columns:
                db.execute(text("ALTER TABLE novels ADD COLUMN outline TEXT DEFAULT ''"))
                added.append("outline")
            if "model_config" not in columns:
                db.execute(text("ALTER TABLE novels ADD COLUMN model_config TEXT DEFAULT '{}'"))
                added.append("model_config")
            if added:
                db.commit()
                print(f"[DB迁移] novels 表新增列: {', '.join(added)}", flush=True)

        if "generation_records" in tables:
            rec_columns = {c["name"] for c in inspector.get_columns("generation_records")}
            rec_added = []
            if "thinking_logs" not in rec_columns:
                db.execute(text("ALTER TABLE generation_records ADD COLUMN thinking_logs TEXT DEFAULT '[]'"))
                rec_added.append("thinking_logs")
            if "chapter_states" not in rec_columns:
                db.execute(text("ALTER TABLE generation_records ADD COLUMN chapter_states TEXT DEFAULT '[]'"))
                rec_added.append("chapter_states")
            if rec_added:
                db.commit()
                print(f"[DB迁移] generation_records 表新增列: {', '.join(rec_added)}", flush=True)

        # 回溯生成记录：为已有 novels 创建 GenerationRecord
        if "novels" in tables and "generation_records" in tables:
            novel_count = db.query(Novel).count()
            record_count = db.query(GenerationRecord).count()
            if novel_count > 0 and record_count == 0:
                print(f"[DB迁移] 为 {novel_count} 篇已有小说回溯生成记录...", flush=True)
                for novel in db.query(Novel).all():
                    is_failed = (not novel.content or
                                 novel.content.startswith("[生成失败]") or
                                 "生成中断" in (novel.title or ""))
                    chapters_list = []
                    try:
                        chapters_list = json.loads(novel.chapters) if novel.chapters else []
                    except (json.JSONDecodeError, TypeError):
                        pass

                    # 已完成的章节数
                    completed = 0
                    if not is_failed and novel.content:
                        completed = len(novel.content.split("## ")) - 1

                    record = GenerationRecord(
                        novel_id=novel.id,
                        params=json.dumps({
                            "seed_text": novel.seed_text or "",
                            "gender": novel.gender or "男频",
                            "genre": novel.genre or "都市脑洞",
                            "style": novel.style or "轻松搞笑",
                            "word_count": novel.word_count or 3000,
                            "per_chapter_min": novel.per_chapter_min or 800,
                            "per_chapter_max": novel.per_chapter_max or 2500,
                        }, ensure_ascii=False),
                        completed_chapters=completed,
                        total_chapters=len(chapters_list),
                        status="failed" if is_failed else "completed",
                        content_sofar=novel.content[:50000] if novel.content else "",
                        error_message="生成中断（v1.2 之前的记录）" if is_failed else "",
                        seed_text=novel.seed_text or "",
                        created_at=novel.created_at if novel.created_at else datetime.now(),
                        updated_at=datetime.now(),
                    )
                    db.add(record)
                db.commit()
                print(f"[DB迁移] 成功回溯 {novel_count} 条生成记录", flush=True)

        # model_configs 表迁移
        if "model_configs" not in tables:
            db.execute(text("""
                CREATE TABLE IF NOT EXISTS model_configs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    provider VARCHAR(50) NOT NULL DEFAULT 'opencode',
                    label VARCHAR(100) DEFAULT '',
                    base_url VARCHAR(500) DEFAULT '',
                    model_id VARCHAR(100) DEFAULT '',
                    api_key TEXT DEFAULT '',
                    is_default BOOLEAN DEFAULT 1,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """))
            db.commit()
            print("[DB迁移] 创建 model_configs 表", flush=True)
    finally:
        db.close()
