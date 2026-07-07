"""从 doc/novel/ 文件系统重建 novels_index.json + DB 记录

用法:
    cd backend && python scripts/restore_from_files.py
    cd backend && python scripts/restore_from_files.py --non-interactive    # 跳过询问

设计: 以 doc/novel/ 为数据源, 自动提取可恢复的元数据,
     缺失值优先交互式询问, --non-interactive 时使用默认值。
"""
import argparse
import json
import os
import re
import sys
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

NOVEL_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "..", "doc", "novel")
INDEX_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "novels_index.json")


def parse_outline_md(md_path):
    """从大纲 Markdown 提取 gender/genre/style + elements + chapters"""
    result = {
        "gender": None, "genre": None, "style": None,
        "elements": {},
        "chapters": [],
    }
    if not md_path or not os.path.exists(md_path):
        return result

    with open(md_path, "r", encoding="utf-8") as f:
        text = f.read()

    m = re.search(r">\s*(.+?)\s*·\s*(.+?)\s*·\s*(.+?)\s*\n", text)
    if m:
        result["gender"] = m.group(1).strip()
        result["genre"] = m.group(2).strip()
        result["style"] = m.group(3).strip()

    in_elements = False
    for line in text.split("\n"):
        if "## 故事要素" in line:
            in_elements = True
            continue
        if "## 章节大纲" in line:
            in_elements = False
            continue
        if in_elements:
            em = re.match(r'-\s+\*\*(.+?)\*\*:\s*(.+)', line)
            if em:
                result["elements"][em.group(1).strip()] = em.group(2).strip()

    in_chapters = False
    for line in text.split("\n"):
        if "## 章节大纲" in line:
            in_chapters = True
            continue
        if in_chapters:
            cm = re.match(r'###\s+(第\d+章\s*.+?)\n', line)
            if cm:
                ch_title = cm.group(1).strip()
                # 下一行是摘要
                result["chapters"].append({"title": ch_title, "summary": ""})
            elif result["chapters"] and not line.startswith("#") and line.strip():
                result["chapters"][-1]["summary"] = (result["chapters"][-1]["summary"] + " " + line.strip()).strip()

    return result


def extract_chapters_from_files(dir_path):
    """从章节 TXT 文件名提取章节标题列表"""
    chapters = []
    pattern = re.compile(r'第(\d+)章\s*(.+?)\.txt$')
    files = []
    for fname in os.listdir(dir_path):
        cm = pattern.match(fname)
        if cm:
            files.append((int(cm.group(1)), cm.group(2).strip(), fname))
    files.sort(key=lambda x: x[0])
    for idx, title, fname in files:
        chapters.append({"title": f"第{idx}章 {title}", "summary": ""})
    return chapters


def read_full_text(dir_path, title):
    """读取全文 TXT"""
    for fname in os.listdir(dir_path):
        if fname.endswith(".txt") and not fname.startswith("第") and not fname.endswith("大纲.md"):
            fpath = os.path.join(dir_path, fname)
            if os.path.isfile(fpath):
                with open(fpath, "r", encoding="utf-8") as f:
                    return f.read()
    return ""


def get_outline_md_path(dir_path):
    for fname in os.listdir(dir_path):
        if fname.endswith("大纲.md"):
            return os.path.join(dir_path, fname)
    return None


def prompt_value(label, default="", required=False):
    """交互式询问用户输入"""
    if required:
        prompt_text = f"  ⚠️ 请输入 {label}"
        if default:
            prompt_text += f" [默认: {default}]"
        prompt_text += ": "
        val = input(prompt_text).strip()
        if not val and default:
            return default
        if val:
            return val
        return prompt_value(label, default, required)
    else:
        prompt_text = f"  ⚠️ 请输入 {label}"
        if default:
            prompt_text += f" [留空=默认: {default}]"
        prompt_text += ": "
        val = input(prompt_text).strip()
        return val if val else default


def scan_novels(interactive=True):
    """扫描 doc/novel/，返回可恢复的小说数据列表"""
    novels = []
    if not os.path.isdir(NOVEL_DIR):
        print(f"  doc/novel/ 目录不存在: {NOVEL_DIR}")
        return novels

    entries = sorted(os.listdir(NOVEL_DIR))
    for entry in entries:
        dir_path = os.path.join(NOVEL_DIR, entry)
        if not os.path.isdir(dir_path):
            continue

        title = entry.strip()
        print(f"\n  发现小说目录: {title}")

        md_path = get_outline_md_path(dir_path)
        parsed = parse_outline_md(md_path) if md_path else {}

        gender = parsed.get("gender") or "男频"
        genre = parsed.get("genre") or "都市脑洞"
        style = parsed.get("style") or "轻松搞笑"

        chapters = parsed.get("chapters", [])
        if not chapters:
            chapters = extract_chapters_from_files(dir_path)
        if not chapters:
            print(f"  ⚠️ 未能提取章节信息: {title}")
            continue

        elements = parsed.get("elements", {})

        content = read_full_text(dir_path, title)
        actual_count = len(content)

        has_outline_file = md_path is not None
        outline_md_content = ""
        if has_outline_file:
            with open(md_path, "r", encoding="utf-8") as f:
                outline_md_content = f.read()

        auto_fields = {
            "title": title,
            "gender": gender,
            "genre": genre,
            "style": style,
            "chapters": chapters,
            "actual_count": actual_count,
            "has_outline": has_outline_file,
            "outline_md": outline_md_content,
            "elements": elements,
        }
        print(f"    ✅ 自动提取: title={title}, gender={gender}, genre={genre}, style={style}")
        print(f"    ✅ 章节: {len(chapters)}章, 总字数: {actual_count}")

        if interactive:
            seed_text = prompt_value("seed_text (种子句)", required=True)
            word_count = prompt_value("word_count (目标字数)", default=str(actual_count))
            per_chapter_min = prompt_value("per_chapter_min (每章最少字数)", default="2000")
            per_chapter_max = prompt_value("per_chapter_max (每章最多字数)", default="3000")
            model_used = prompt_value("model_used (使用的模型)", default="unknown")
        else:
            seed_text = "（从文件恢复，原始种子句已丢失）"
            word_count = str(actual_count)
            per_chapter_min = "2000"
            per_chapter_max = "3000"
            model_used = "unknown"

        novel = {
            "title": title,
            "seed_text": seed_text,
            "gender": gender,
            "genre": genre,
            "style": style,
            "word_count": int(word_count),
            "per_chapter_min": int(per_chapter_min),
            "per_chapter_max": int(per_chapter_max),
            "actual_count": actual_count,
            "content": content,
            "chapters": chapters,
            "outline": {"chapters": chapters, "elements": elements},
            "model_used": model_used,
            "model_config": {},
            "time_cost": 0.0,
        }
        novels.append(novel)
    return novels


def write_index(novels):
    """写入 novels_index.json"""
    index = {
        "version": 1,
        "updated_at": datetime.now().isoformat(),
        "novels": novels,
    }
    with open(INDEX_PATH, "w", encoding="utf-8") as f:
        json.dump(index, f, ensure_ascii=False, indent=2)
    print(f"\n  ✅ novels_index.json 已写入: {INDEX_PATH}")


def write_db(novels):
    """将小说数据写入数据库"""
    from app.database import SessionLocal, migrate_database
    from app.models.novel import Novel
    from app.models.generation_record import GenerationRecord

    migrate_database()

    db = SessionLocal()
    try:
        existing = db.query(Novel).count()
        if existing > 0:
            print(f"\n  ⚠️ 数据库中已有 {existing} 条记录，跳过 DB 写入")
            print(f"  💡 如需重建，请先手动清空 novels 和 generation_records 表")
            return

        for i, n in enumerate(novels):
            novel = Novel(
                title=n["title"],
                seed_text=n["seed_text"],
                gender=n["gender"],
                genre=n["genre"],
                style=n["style"],
                word_count=n["word_count"],
                per_chapter_min=n["per_chapter_min"],
                per_chapter_max=n["per_chapter_max"],
                actual_count=n["actual_count"],
                content=n["content"],
                chapters=json.dumps(n["chapters"], ensure_ascii=False),
                outline=json.dumps(n["outline"], ensure_ascii=False),
                model_used=n["model_used"],
                model_config=json.dumps(n["model_config"], ensure_ascii=False),
                time_cost=n["time_cost"],
                created_at=datetime.now(),
            )
            db.add(novel)
            db.flush()
            record = GenerationRecord(
                novel_id=novel.id,
                params=json.dumps({
                    "seed_text": n["seed_text"],
                    "gender": n["gender"],
                    "genre": n["genre"],
                    "style": n["style"],
                    "word_count": n["word_count"],
                    "per_chapter_min": n["per_chapter_min"],
                    "per_chapter_max": n["per_chapter_max"],
                }, ensure_ascii=False),
                completed_chapters=len(n["chapters"]),
                total_chapters=len(n["chapters"]),
                status="completed",
                content_sofar=n["content"][:50000],
                seed_text=n["seed_text"],
                created_at=datetime.now(),
                updated_at=datetime.now(),
            )
            db.add(record)
            print(f"  ✅ DB写入: {n['title']} (ID={novel.id})")

        db.commit()
        print(f"\n  🎉 共恢复 {len(novels)} 部小说")
    finally:
        db.close()


def main():
    parser = argparse.ArgumentParser(description="从 doc/novel/ 恢复小说数据")
    parser.add_argument("--non-interactive", "-y", action="store_true",
                        help="非交互模式，缺失字段使用默认值")
    parser.add_argument("--db-only", action="store_true",
                        help="仅写入 DB（不更新 index）")
    parser.add_argument("--index-only", action="store_true",
                        help="仅更新 index（不写入 DB）")
    args = parser.parse_args()

    print("📂 扫描 doc/novel/ 目录...")
    novels = scan_novels(interactive=not args.non_interactive)

    if not novels:
        print("  ❌ 未发现可恢复的小说数据")
        return

    if not args.db_only:
        write_index(novels)

    if not args.index_only:
        write_db(novels)

    print(f"\n  💡 提示: novels_index.json 已存入 git 跟踪，"
          f"以后在其他电脑上拉取后会自动重建 DB。")


if __name__ == "__main__":
    main()
