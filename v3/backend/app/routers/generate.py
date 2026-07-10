"""生成小说 API（SSE 流式接口 + 生成记录管理 + 继续生成）"""
import json
import re
from typing import Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database import get_db, SessionLocal
from app.models.novel import Novel
from app.models.generation_record import GenerationRecord
from app.models.chapter_content import ChapterContent
from app.llm.provider import get_llm_provider, get_provider_config_status
from app.services.generator import GeneratorService, _log
from app.data import get_categories_by_gender, STYLES, GENDERS, CHINESE_MODELS, THEMES

router = APIRouter(prefix="/api/v3")


class GenerateRequest(BaseModel):
    seed_text: str
    gender: str = "男频"
    genre: str = "都市脑洞"
    style: str = "轻松搞笑"
    word_count: int = 3000
    chapter_count: Optional[int] = None
    per_chapter_min: int = 800
    per_chapter_max: int = 2500
    llm_config: Optional[dict] = None
    custom_prompts: Optional[dict] = None
    record_id: Optional[int] = None  # 用于继续生成
    # V3 继承字段
    pov: str = "第三人称有限"          # 视角：第一人称/第三人称有限/上帝视角
    pacing: str = "标准型"             # 节奏：紧凑型/标准型/舒缓型
    style_intensity: str = "中度"      # 风格强度：轻度/中度/重度
    enable_suspense: bool = True       # 启用悬念
    enable_twist: bool = True          # 启用反转
    # V3 新增字段
    theme: str = ""                    # 核心主题
    aesthetic_intensity: str = "中度"  # 美学强度：关闭/轻度/中度/重度
    # F7 对比模式
    opening_text: Optional[str] = None  # 已选开头（对比模式续生用）
    # F7 结局类型
    ending_type: str = ""  # 好结局/坏结局/开放式


class ThemeSuggestRequest(BaseModel):
    seed_text: str
    genre: str = "都市脑洞"
    style: str = "轻松搞笑"


@router.post("/theme/suggest")
async def suggest_theme(req: ThemeSuggestRequest):
    """AI 根据种子句推荐主题"""
    config_status = get_provider_config_status()
    if not config_status["configured"]:
        import random
        return {"theme": random.choice(THEMES)}

    llm = get_llm_provider()
    prompt = (
        f"用户写一篇{req.genre}题材、{req.style}风格的小说。\n"
        f"种子句：{req.seed_text}\n\n"
        f"请从以下主题中选择最贴合的一个，直接输出主题词，不要多余内容：\n"
        + "\n".join(f"- {t}" for t in THEMES)
    )
    try:
        result = ""
        async for chunk in llm.generate_stream(prompt):
            result += chunk
        result = result.strip()
        if result in THEMES:
            return {"theme": result}
        # 模糊匹配
        for t in THEMES:
            if t in result:
                return {"theme": t}
        return {"theme": THEMES[0]}
    except Exception:
        import random
        return {"theme": random.choice(THEMES)}


class OpeningsRequest(BaseModel):
    seed_text: str
    gender: str = "男频"
    genre: str = "都市脑洞"
    style: str = "轻松搞笑"
    word_count: int = 3000
    chapter_count: Optional[int] = None
    per_chapter_min: int = 800
    per_chapter_max: int = 2500
    llm_config: Optional[dict] = None
    custom_prompts: Optional[dict] = None
    pov: str = "第三人称有限"
    pacing: str = "标准型"
    style_intensity: str = "中度"
    enable_suspense: bool = True
    enable_twist: bool = True
    theme: str = ""
    aesthetic_intensity: str = "中度"


@router.post("/generate/openings")
async def generate_openings(req: OpeningsRequest):
    """SSE 流式生成 2-3 个不同风格的开头版本供用户选择"""
    llm = get_llm_provider(req.llm_config)
    service = GeneratorService(llm)

    # F7: 多版本开头对比 — 覆盖不同视角 × 节奏组合
    POV_OPTIONS = ["第一人称", "第三人称有限", "上帝视角"]
    PACE_OPTIONS = [
        ("标准型", "均衡叙事，对话与描写交替，标准节奏"),
        ("紧凑型", "对话多、描述少、推进快，瞬间抓住读者"),
        ("舒缓型", "环境描写细腻、心理活动丰富，带入感强"),
    ]

    # 生成 5 个版本：3 种视角 × 2 种节奏（用户当前视角 + 其他视角各一快一慢）
    user_pov = req.pov
    user_pace = req.pacing
    STYLE_VARIANTS = []
    seen = set()

    # 1) 用户当前视角 + 用户当前节奏
    STYLE_VARIANTS.append({
        "label": f"{user_pov}·{user_pace}",
        "pov": user_pov, "pacing": user_pace,
        "desc": f"使用你选择的视角和节奏",
        "tag": "当前设置",
    })
    seen.add((user_pov, user_pace))

    # 2) 用户视角 + 其他节奏
    for pace, pace_desc in PACE_OPTIONS:
        if pace != user_pace and (user_pov, pace) not in seen:
            STYLE_VARIANTS.append({
                "label": f"{user_pov}·{pace}",
                "pov": user_pov, "pacing": pace,
                "desc": pace_desc,
                "tag": "视角",
            })
            seen.add((user_pov, pace))
            break

    # 3) 其他视角 + 用户节奏
    for pov in POV_OPTIONS:
        if pov != user_pov and (pov, user_pace) not in seen:
            STYLE_VARIANTS.append({
                "label": f"{pov}·{user_pace}",
                "pov": pov, "pacing": user_pace,
                "desc": f"换用{pov}视角",
                "tag": "视角",
            })
            seen.add((pov, user_pace))
            break

    # 4) 其他视角 + 不同节奏（补充到 4-5 个）
    for pov in POV_OPTIONS:
        for pace, pace_desc in PACE_OPTIONS:
            if (pov, pace) not in seen and len(STYLE_VARIANTS) < 5:
                STYLE_VARIANTS.append({
                    "label": f"{pov}·{pace}",
                    "pov": pov, "pacing": pace,
                    "desc": f"{pov}视角 + {pace_desc}",
                    "tag": "探索",
                })
                seen.add((pov, pace))
                break
        if len(STYLE_VARIANTS) >= 5:
            break

    async def event_stream():
        yield f"event: log\ndata: {json.dumps({'step': 'openings', 'type': 'info', 'text': '🎬 正在生成多个开头版本供选择...'}, ensure_ascii=False)}\n\n"

        openings = []
        for idx, variant in enumerate(STYLE_VARIANTS):
            log_text = f"  ✍️ 生成版本 {idx+1}/{len(STYLE_VARIANTS)}：{variant['label']}"
            yield f"event: log\ndata: {json.dumps({'step': 'openings', 'type': 'info', 'text': log_text}, ensure_ascii=False)}\n\n"
            try:
                text = await service._generate_opening(
                    seed_text=req.seed_text, gender=req.gender,
                    genre=req.genre, style=req.style,
                    pacing=variant["pacing"],
                    pov=variant.get("pov", req.pov),
                    style_intensity=req.style_intensity,
                    theme=req.theme,
                    target_words=500,
                )
                if text and len(text) > 100:
                    openings.append({
                        "index": idx,
                        "label": variant["label"],
                        "pov": variant.get("pov", req.pov),
                        "pacing": variant["pacing"],
                        "desc": variant["desc"],
                        "tag": variant.get("tag", ""),
                        "text": text,
                    })
                    yield f"event: opening_version\ndata: {json.dumps(openings[-1], ensure_ascii=False)}\n\n"
                    succ_text = f"  ✅ {variant['label']} 完成（{len(text)}字）"
                    yield f"event: log\ndata: {json.dumps({'step': 'openings', 'type': 'success', 'text': succ_text}, ensure_ascii=False)}\n\n"
                else:
                    warn_text = f"  ⚠️ {variant['label']} 生成内容过短"
                    yield f"event: log\ndata: {json.dumps({'step': 'openings', 'type': 'warn', 'text': warn_text}, ensure_ascii=False)}\n\n"
            except Exception as e:
                err_text = f"  ❌ {variant['label']} 生成失败: {e}"
                yield f"event: log\ndata: {json.dumps({'step': 'openings', 'type': 'error', 'text': err_text}, ensure_ascii=False)}\n\n"

        if not openings:
            yield f"event: error\ndata: {json.dumps({'message': '所有开头版本生成失败'}, ensure_ascii=False)}\n\n"
            return

        yield f"event: openings_done\ndata: {json.dumps({'openings': openings}, ensure_ascii=False)}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")


@router.post("/generate")
async def generate_novel(req: GenerateRequest):
    """SSE 流式生成小说（支持继续生成）"""
    if not req.seed_text.strip():
        return {"error": "seed_text 不能为空"}
    if req.gender not in GENDERS:
        return {"error": f"不支持的频道，可选：{', '.join(GENDERS)}"}
    valid_categories = get_categories_by_gender(req.gender)
    if req.genre not in valid_categories:
        return {"error": f"{req.gender}不支持该题材，可选：{', '.join(valid_categories)}"}
    style_parts = req.style.split('+')
    invalid = [s for s in style_parts if s not in STYLES]
    if invalid:
        return {"error": f"不支持的风格: {', '.join(invalid)}，可选：{', '.join(STYLES)}"}
    if req.word_count < 500:
        req.word_count = 500
    elif req.word_count > 500000:
        req.word_count = 500000
    if req.per_chapter_min < 200:
        req.per_chapter_min = 200
    if req.per_chapter_max > 20000:
        req.per_chapter_max = 20000
    if req.per_chapter_min > req.per_chapter_max:
        req.per_chapter_min, req.per_chapter_max = req.per_chapter_max, req.per_chapter_min

    config_status = get_provider_config_status()
    if not config_status["configured"] and not req.llm_config:
        async def error_stream():
            yield f"event: error\ndata: {json.dumps({'message': config_status['error'], 'type': 'config'}, ensure_ascii=False)}\n\n"
        return StreamingResponse(error_stream(), media_type="text/event-stream")

    # 创建生成记录
    db = SessionLocal()
    record = GenerationRecord(
        params=json.dumps(req.model_dump(exclude={"llm_config"}), ensure_ascii=False),
        status="in_progress",
        seed_text=req.seed_text,
        created_at=datetime.now(),
        updated_at=datetime.now(),
    )
    db.add(record)
    db.commit()
    record_id = record.id
    db.close()

    llm = get_llm_provider(req.llm_config)
    service = GeneratorService(llm)

    async def event_stream():
        thinking_logs = []
        def _save_logs():
            if thinking_logs and record_id:
                db_l = SessionLocal()
                try:
                    rec = db_l.query(GenerationRecord).filter(GenerationRecord.id == record_id).first()
                    if rec:
                        rec.thinking_logs = json.dumps(thinking_logs, ensure_ascii=False)
                        db_l.commit()
                finally:
                    db_l.close()

        try:
            async for event in service.generate(
                seed_text=req.seed_text, gender=req.gender, genre=req.genre,
                style=req.style, word_count=req.word_count,
                chapter_count=req.chapter_count,
                per_chapter_min=req.per_chapter_min, per_chapter_max=req.per_chapter_max,
                model_config=req.llm_config,
                custom_prompts=req.custom_prompts,
                record_id=record_id,
                pov=req.pov, pacing=req.pacing,
                style_intensity=req.style_intensity,
                enable_suspense=req.enable_suspense, enable_twist=req.enable_twist,
                theme=req.theme,
                aesthetic_intensity=req.aesthetic_intensity,
                opening_text=req.opening_text,
                ending_type=req.ending_type,
            ):
                if event['event'] == 'log':
                    msg = event['data']
                    if isinstance(msg, dict): msg = msg.get('text', '')
                    thinking_logs.append({
                        'time': datetime.now().strftime('%H:%M:%S'),
                        'type': 'info' if not str(msg).startswith('❌') else 'error',
                        'text': str(msg),
                    })
                # 保存完整大纲到生成记录
                if event['event'] == 'outline_done':
                    db_o = SessionLocal()
                    try:
                        rec_o = db_o.query(GenerationRecord).filter(GenerationRecord.id == record_id).first()
                        if rec_o:
                            rec_o.outline_data = json.dumps(event['data'].get('outline', {}), ensure_ascii=False)
                            db_o.commit()
                    finally:
                        db_o.close()
                # 保存情感曲线到生成记录
                if event['event'] == 'emotion_curve' and isinstance(event['data'], list):
                    db_ec = SessionLocal()
                    try:
                        rec_ec = db_ec.query(GenerationRecord).filter(GenerationRecord.id == record_id).first()
                        if rec_ec:
                            od = json.loads(rec_ec.outline_data) if rec_ec.outline_data else {}
                            od['emotion_curve'] = event['data']
                            rec_ec.outline_data = json.dumps(od, ensure_ascii=False)
                            db_ec.commit()
                    finally:
                        db_ec.close()
                # 关键节点保存日志
                if event['event'] in ('chapter_end', 'complete', 'error'):
                    _save_logs()
                yield f"event: {event['event']}\ndata: {json.dumps(event['data'], ensure_ascii=False)}\n\n"
        except Exception as e:
            yield f"event: error\ndata: {json.dumps({'message': str(e)}, ensure_ascii=False)}\n\n"
            _log(f"event_stream 异常: {e}")
            _save_logs()
            db_e = SessionLocal()
            try:
                rec = db_e.query(GenerationRecord).filter(GenerationRecord.id == record_id).first()
                if rec and rec.status == "in_progress":
                    rec.status = "failed"
                    rec.error_message = f"连接中断: {e}"
                    db_e.commit()
            finally:
                db_e.close()
        finally:
            _save_logs()
            # 确保记录不会卡在 in_progress
            db_f = SessionLocal()
            try:
                rec = db_f.query(GenerationRecord).filter(GenerationRecord.id == record_id).first()
                if rec and rec.status == "in_progress":
                    rec.status = "failed"
                    rec.error_message = "生成中断（客户端断开）"
                    db_f.commit()
            finally:
                db_f.close()

    return StreamingResponse(event_stream(), media_type="text/event-stream")


@router.post("/generate/continue")
async def continue_generation(record_id: int = Query(...)):
    """根据生成记录继续生成"""
    db = SessionLocal()
    try:
        record = db.query(GenerationRecord).filter(GenerationRecord.id == record_id).first()
        if not record:
            raise HTTPException(status_code=404, detail="记录不存在")
        if record.status not in ("failed", "cancelled"):
            raise HTTPException(status_code=400, detail="只有失败或已取消的记录可以继续生成")

        try:
            params = json.loads(record.params) if record.params else {}
        except (json.JSONDecodeError, TypeError):
            raise HTTPException(status_code=400, detail="记录参数格式错误，无法继续生成")
        req = GenerateRequest(**params)

        # 查找已有的 novel（如果有）
        existing_novel = None
        continuation = None
        if record.novel_id:
            existing_novel = db.query(Novel).filter(Novel.id == record.novel_id).first()

        if existing_novel and existing_novel.content and not existing_novel.content.startswith("[生成失败]"):
            # 有部分内容，构造继续生成参数
            # 优先从 chapter_contents 表加载（精确按章节索引）
            existing_blocks = []
            db_chapters = None
            if existing_novel.id:
                db_chapters = db.query(ChapterContent).filter(
                    ChapterContent.novel_id == existing_novel.id
                ).order_by(ChapterContent.chapter_index).all()
            if db_chapters:
                existing_blocks = [
                    f"## {ch.title}\n\n{ch.content}" for ch in db_chapters
                ]
                content = "\n\n".join(existing_blocks)
            else:
                # 回退到从 novel.content 字符串拆分
                content = existing_novel.content
                existing_blocks = [b for b in re.split(r"\n(?=## )", content) if b and b.strip()] if content else []
            # 解析大纲
            try:
                outline = json.loads(existing_novel.outline) if existing_novel.outline else {}
            except (json.JSONDecodeError, TypeError):
                outline = {}
            chapters = outline.get("chapters", [])
            elements = outline.get("elements", {})
            completed = record.completed_chapters or len(existing_blocks)

            emotion_curve_from_db = []
            if existing_novel.emotion_curve:
                try:
                    emotion_curve_from_db = json.loads(existing_novel.emotion_curve)
                except (json.JSONDecodeError, TypeError):
                    pass

            # 从记录加载大纲数据（优先使用 record.outline_data）
            outline_data = {}
            if record.outline_data:
                try:
                    outline_data = json.loads(record.outline_data)
                except (json.JSONDecodeError, TypeError):
                    pass
            if not outline_data:
                outline_data = outline

            continuation = {
                "novel_id": existing_novel.id,
                "content": content,
                "parts": existing_blocks,
                "chapters": chapters,
                "elements": elements,
                "outline": outline_data,
                "start_from": completed,
                "emotion_curve": emotion_curve_from_db,
            }
            _log(f"继续生成: novel_id={existing_novel.id}, 已有{completed}/{len(chapters)}章")
            _log(f"  已有内容前30字: {content[:30]}...")

            # 恢复 params 中的章节数
            req.chapter_count = len(chapters)

        new_record = GenerationRecord(
            params=record.params,
            status="in_progress",
            seed_text=record.seed_text,
            created_at=datetime.now(),
            updated_at=datetime.now(),
        )
        db.add(new_record)
        db.commit()
        new_record_id = new_record.id
    finally:
        db.close()

    config_status = get_provider_config_status()
    llm = get_llm_provider(req.llm_config)
    service = GeneratorService(llm)

    async def event_stream():
        thinking_logs = json.loads(record.thinking_logs) if record.thinking_logs else []
        def _save_logs():
            if thinking_logs and new_record_id:
                db_l = SessionLocal()
                try:
                    rec = db_l.query(GenerationRecord).filter(GenerationRecord.id == new_record_id).first()
                    if rec:
                        rec.thinking_logs = json.dumps(thinking_logs, ensure_ascii=False)
                        db_l.commit()
                finally:
                    db_l.close()

        try:
            yield f"event: continue_from\ndata: {json.dumps({'original_record_id': record_id}, ensure_ascii=False)}\n\n"
            async for event in service.generate(
                seed_text=req.seed_text, gender=req.gender, genre=req.genre,
                style=req.style, word_count=req.word_count,
                chapter_count=req.chapter_count,
                per_chapter_min=req.per_chapter_min, per_chapter_max=req.per_chapter_max,
                model_config=req.llm_config,
                custom_prompts=req.custom_prompts,
                record_id=new_record_id,
                continuation=continuation,
                pov=req.pov, pacing=req.pacing,
                style_intensity=req.style_intensity,
                enable_suspense=req.enable_suspense, enable_twist=req.enable_twist,
                theme=req.theme,
                aesthetic_intensity=req.aesthetic_intensity,
            ):
                if event['event'] == 'log':
                    msg = event['data']
                    if isinstance(msg, dict): msg = msg.get('text', '')
                    thinking_logs.append({
                        'time': datetime.now().strftime('%H:%M:%S'),
                        'type': 'info' if not str(msg).startswith('❌') else 'error',
                        'text': str(msg),
                    })
                if event['event'] in ('chapter_end', 'complete', 'error'):
                    _save_logs()
                yield f"event: {event['event']}\ndata: {json.dumps(event['data'], ensure_ascii=False)}\n\n"
        except Exception as e:
            yield f"event: error\ndata: {json.dumps({'message': str(e)}, ensure_ascii=False)}\n\n"
            _save_logs()
            db_e = SessionLocal()
            try:
                rec = db_e.query(GenerationRecord).filter(GenerationRecord.id == new_record_id).first()
                if rec and rec.status == "in_progress":
                    rec.status = "failed"
                    rec.error_message = f"连接中断: {e}"
                    db_e.commit()
            finally:
                db_e.close()
        finally:
            _save_logs()
            db_f = SessionLocal()
            try:
                rec = db_f.query(GenerationRecord).filter(GenerationRecord.id == new_record_id).first()
                if rec and rec.status == "in_progress":
                    rec.status = "failed"
                    rec.error_message = "生成中断（客户端断开）"
                    db_f.commit()
            finally:
                db_f.close()

    return StreamingResponse(event_stream(), media_type="text/event-stream")


# ── 生成记录 CRUD ──


@router.get("/records")
async def list_records(page: int = 1, size: int = 20, db: Session = Depends(get_db)):
    """获取生成记录列表（含状态）"""
    total = db.query(GenerationRecord).count()
    items = db.query(GenerationRecord).order_by(desc(GenerationRecord.created_at)).offset(
        (page - 1) * size).limit(size).all()
    return {
        "total": total, "page": page, "size": size,
        "items": [
            {
                "id": r.id,
                "novel_id": r.novel_id,
                "status": r.status,
                "completed_chapters": r.completed_chapters,
                "total_chapters": r.total_chapters,
                "seed_text": r.seed_text[:100] + "..." if len(r.seed_text) > 100 else r.seed_text,
                "error_message": r.error_message,
                "created_at": r.created_at.isoformat() if r.created_at else "",
                "updated_at": r.updated_at.isoformat() if r.updated_at else "",
            }
            for r in items
        ],
    }


@router.get("/records/{record_id}")
async def get_record(record_id: int, db: Session = Depends(get_db)):
    """获取单条生成记录详情"""
    r = db.query(GenerationRecord).filter(GenerationRecord.id == record_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="记录不存在")
    logs = json.loads(r.thinking_logs) if r.thinking_logs else []
    cs = json.loads(r.chapter_states) if r.chapter_states else []
    emotion_curve_data = []
    if r.novel_id:
        n = db.query(Novel).filter(Novel.id == r.novel_id).first()
        if n and n.emotion_curve:
            try:
                emotion_curve_data = json.loads(n.emotion_curve)
            except (json.JSONDecodeError, TypeError):
                pass
    return {
        "id": r.id,
        "novel_id": r.novel_id,
        "params": json.loads(r.params) if r.params else {},
        "completed_chapters": r.completed_chapters,
        "total_chapters": r.total_chapters,
        "status": r.status,
        "content_sofar": r.content_sofar,
        "error_message": r.error_message,
        "seed_text": r.seed_text,
        "thinking_logs": logs,
        "chapter_states": cs,
        "outline_data": json.loads(r.outline_data) if r.outline_data else {},
        "emotion_curve": emotion_curve_data,
        "created_at": r.created_at.isoformat() if r.created_at else "",
        "updated_at": r.updated_at.isoformat() if r.updated_at else "",
    }


@router.post("/records/{record_id}/cancel")
async def cancel_record(record_id: int, db: Session = Depends(get_db)):
    """手动取消正在生成的记录（前端停止按钮调用）"""
    r = db.query(GenerationRecord).filter(GenerationRecord.id == record_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="记录不存在")
    if r.status not in ("in_progress",):
        raise HTTPException(status_code=400, detail="只有进行中的记录可以取消")
    r.status = "cancelled"
    r.error_message = "用户手动停止"
    r.updated_at = datetime.now()
    db.commit()
    return {"status": "cancelled", "id": record_id}


@router.delete("/records/{record_id}")
async def delete_record(record_id: int, db: Session = Depends(get_db)):
    r = db.query(GenerationRecord).filter(GenerationRecord.id == record_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="记录不存在")
    db.delete(r)
    db.commit()


@router.get("/config/check")
async def check_config():
    return get_provider_config_status()


@router.get("/records/{record_id}/status")
async def get_record_status(record_id: int, db: Session = Depends(get_db)):
    """轻量轮询端点 — 获取记录状态（用于前端轮询）"""
    r = db.query(GenerationRecord).filter(GenerationRecord.id == record_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="记录不存在")
    return {
        "id": r.id,
        "novel_id": r.novel_id,
        "status": r.status,
        "completed_chapters": r.completed_chapters,
        "total_chapters": r.total_chapters,
        "created_at": r.created_at.isoformat() if r.created_at else "",
        "updated_at": r.updated_at.isoformat() if r.updated_at else "",
    }


@router.get("/models/list")
async def list_models():
    """返回所有国产模型配置列表"""
    return {"models": CHINESE_MODELS}


@router.get("/genres/list")
async def list_genres(gender: str = "男频"):
    """获取指定频道的题材列表"""
    return {"gender": gender, "genres": get_categories_by_gender(gender), "styles": STYLES}


# ── 数据清理 ──

@router.post("/cleanup")
async def cleanup_orphaned_data():
    """清理无效数据：孤立的生成中记录、无主的生成记录、失败的小说"""
    db = SessionLocal()
    cleaned = {"orphaned_records": 0, "orphaned_novels": 0, "failed_novels": 0}
    try:
        # 1. 清理无 novel_id 且状态为 in_progress 超过 30 分钟的记录
        from datetime import timedelta
        cutoff = datetime.now() - timedelta(minutes=30)
        stale_records = db.query(GenerationRecord).filter(
            GenerationRecord.novel_id.is_(None),
            GenerationRecord.status == "in_progress",
            GenerationRecord.updated_at < cutoff,
        ).all()
        cleaned["orphaned_records"] = len(stale_records)
        for rec in stale_records:
            db.delete(rec)

        # 2. 清理 title 为 "生成中..." 或包含 "生成中断" 的小说
        bad_novels = db.query(Novel).filter(
            (Novel.title == "生成中...") | (Novel.title.like("%生成中断%"))
        ).all()
        cleaned["orphaned_novels"] = len(bad_novels)
        for novel in bad_novels:
            # 同时清理关联的生成记录
            db.query(GenerationRecord).filter(GenerationRecord.novel_id == novel.id).delete()
            db.delete(novel)

        # 3. 清理没有 content 的已完成记录（无效记录）
        empty_completed = db.query(GenerationRecord).filter(
            GenerationRecord.status == "completed",
            GenerationRecord.novel_id.is_(None),
        ).all()
        cleaned["failed_novels"] += len(empty_completed)
        for rec in empty_completed:
            db.delete(rec)

        db.commit()
    finally:
        db.close()

    _log(f"数据清理完成: {cleaned}")
    return {"status": "ok", "cleaned": cleaned}


@router.post("/records/{record_id}/reset")
async def reset_record_to_failed(record_id: int, db: Session = Depends(get_db)):
    """将卡在 in_progress 的记录重置为 failed（允许用户重新生成）"""
    r = db.query(GenerationRecord).filter(GenerationRecord.id == record_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="记录不存在")
    if r.status != "in_progress":
        raise HTTPException(status_code=400, detail="只有进行中的记录可以重置")
    r.status = "failed"
    r.error_message = "用户手动重置"
    r.updated_at = datetime.now()
    db.commit()
    return {"status": "failed", "id": record_id}
