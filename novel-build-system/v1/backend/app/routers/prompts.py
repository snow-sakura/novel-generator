"""提示词模板只读路由 — 提供原始模板参考，不参与生成"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.prompt_template import PromptTemplate

router = APIRouter(prefix="/api/v1/prompts", tags=["prompts"])


@router.get("")
async def list_prompts(db: Session = Depends(get_db)):
    """获取所有提示词模板（只读）"""
    templates = db.query(PromptTemplate).order_by(PromptTemplate.id).all()
    return [
        {
            "name": t.name,
            "label": t.label,
            "content": t.content,
            "version": t.version,
            "created_at": t.created_at.isoformat() if t.created_at else "",
        }
        for t in templates
    ]


@router.get("/{name}")
async def get_prompt(name: str, db: Session = Depends(get_db)):
    """获取单个提示词模板详情"""
    t = db.query(PromptTemplate).filter(PromptTemplate.name == name).first()
    if not t:
        raise HTTPException(status_code=404, detail="模板不存在")
    return {
        "name": t.name,
        "label": t.label,
        "content": t.content,
        "version": t.version,
        "created_at": t.created_at.isoformat() if t.created_at else "",
    }
