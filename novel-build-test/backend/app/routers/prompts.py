"""提示词工程路由 — Agent 提示词管理、版本控制、模板与 Few-shot"""

import difflib
import time

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.prompt import AgentPrompt, FewShotExample, PromptTemplate, PromptVersion
from app.schemas.base import Page, page_from_query
from app.schemas.prompt import (
    FewShotCreate,
    FewShotResponse,
    FewShotUpdate,
    PromptDebugRequest,
    PromptDebugResponse,
    PromptDiffResponse,
    PromptResponse,
    PromptTemplateCreate,
    PromptTemplateResponse,
    PromptTemplateUpdate,
    PromptUpdate,
    PromptVersionResponse,
)
from app.utils.rbac import 操作, 检查权限

router = APIRouter(prefix="/api/v1", tags=["提示词工程"])


class _RollbackRequest(BaseModel):
    """回滚请求体"""

    version: int = Field(..., ge=1, description="目标版本号")


# ==================== Agent Prompts（版本控制） ====================


@router.get("/prompts", response_model=Page[PromptResponse])
async def list_prompts(
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页条数"),
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.读取)),
):
    """获取所有 Agent 提示词（分页）"""
    count_query = select(func.count()).select_from(AgentPrompt)
    total = (await db.execute(count_query)).scalar() or 0

    query = select(AgentPrompt).order_by(AgentPrompt.agent_key).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    items = list(result.scalars().all())

    return page_from_query(PromptResponse, items, total, page, page_size)


@router.get("/prompts/compare", response_model=PromptDiffResponse)
async def compare_prompt_versions(
    agent_key: str = Query(..., description="Agent 标识"),
    version_a: int = Query(..., ge=1, description="版本 A"),
    version_b: int = Query(..., ge=1, description="版本 B"),
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.读取)),
):
    """比较提示词的两个历史版本"""
    # 查询版本 A
    result_a = await db.execute(
        select(PromptVersion).where(PromptVersion.agent_key == agent_key, PromptVersion.version == version_a)
    )
    ver_a = result_a.scalar_one_or_none()
    if not ver_a:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"版本 {version_a} 不存在",
        )

    # 查询版本 B
    result_b = await db.execute(
        select(PromptVersion).where(PromptVersion.agent_key == agent_key, PromptVersion.version == version_b)
    )
    ver_b = result_b.scalar_one_or_none()
    if not ver_b:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"版本 {version_b} 不存在",
        )

    # 使用 difflib 生成简化 diff
    diff_lines = list(
        difflib.unified_diff(
            ver_a.content.splitlines(keepends=True),
            ver_b.content.splitlines(keepends=True),
            fromfile=f"v{version_a}",
            tofile=f"v{version_b}",
        )
    )
    diff_text = "".join(diff_lines)

    return PromptDiffResponse(version_a=ver_a, version_b=ver_b, diff=diff_text)


@router.post("/prompts/debug", response_model=PromptDebugResponse)
async def debug_prompt(
    data: PromptDebugRequest,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.读取)),
):
    """在线调试 — 用样本输入测试提示词（模拟返回）"""
    start = time.monotonic()

    simulated_output = (
        f"[模拟 {data.model} 返回]\n"
        f"Agent: {data.agent_key}\n"
        f"Prompt 长度: {len(data.prompt)} 字符\n"
        f"输入文本: {data.input_text[:200]}"
    )

    elapsed_ms = int((time.monotonic() - start) * 1000)

    return PromptDebugResponse(
        output=simulated_output,
        model=data.model,
        latency_ms=elapsed_ms,
        prompt_tokens=len(data.prompt) // 4,
        completion_tokens=len(simulated_output) // 4,
    )


@router.get("/prompts/{agent_key}", response_model=PromptResponse)
async def get_prompt(
    agent_key: str,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.读取)),
):
    """获取指定 Agent 的当前提示词"""
    result = await db.execute(select(AgentPrompt).where(AgentPrompt.agent_key == agent_key))
    prompt = result.scalar_one_or_none()
    if not prompt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="提示词不存在")
    return prompt


@router.put("/prompts/{agent_key}", response_model=PromptResponse)
async def update_prompt(
    agent_key: str,
    data: PromptUpdate,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.更新)),
):
    """更新提示词 — 自动创建新版本，保存旧版本到历史表"""
    result = await db.execute(select(AgentPrompt).where(AgentPrompt.agent_key == agent_key))
    prompt = result.scalar_one_or_none()
    if not prompt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="提示词不存在")

    # 保存旧版本到 PromptVersion 表
    old_version = PromptVersion(
        agent_key=prompt.agent_key,
        version=prompt.version,
        content=prompt.content,
        change_note=data.change_note,
        created_by=当前用户.get("用户ID"),
    )
    db.add(old_version)

    # 更新当前提示词
    prompt.content = data.content
    prompt.version += 1

    await db.commit()
    await db.refresh(prompt)
    return prompt


@router.get("/prompts/{agent_key}/versions", response_model=Page[PromptVersionResponse])
async def list_prompt_versions(
    agent_key: str,
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页条数"),
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.读取)),
):
    """获取指定 Agent 的版本历史（分页）"""
    # 先确认 agent 存在
    exists = await db.execute(select(AgentPrompt).where(AgentPrompt.agent_key == agent_key))
    if not exists.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="提示词不存在")

    # 总数
    count_query = select(func.count()).select_from(PromptVersion).where(PromptVersion.agent_key == agent_key)
    total = (await db.execute(count_query)).scalar() or 0

    # 分页数据
    query = (
        select(PromptVersion)
        .where(PromptVersion.agent_key == agent_key)
        .order_by(PromptVersion.version.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    result = await db.execute(query)
    items = list(result.scalars().all())

    return page_from_query(PromptVersionResponse, items, total, page, page_size)


@router.post("/prompts/{agent_key}/rollback", response_model=PromptResponse)
async def rollback_prompt(
    agent_key: str,
    body: _RollbackRequest,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.更新)),
):
    """回滚到指定版本 — 恢复内容并设置当前版本号"""
    # 获取当前提示词
    result = await db.execute(select(AgentPrompt).where(AgentPrompt.agent_key == agent_key))
    prompt = result.scalar_one_or_none()
    if not prompt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="提示词不存在")

    # 获取目标版本
    ver_result = await db.execute(
        select(PromptVersion).where(PromptVersion.agent_key == agent_key, PromptVersion.version == body.version)
    )
    target = ver_result.scalar_one_or_none()
    if not target:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"版本 {body.version} 不存在",
        )

    # 如果当前版本不同于目标版本，将当前状态快照到历史表
    if prompt.version != body.version:
        snapshot = PromptVersion(
            agent_key=prompt.agent_key,
            version=prompt.version,
            content=prompt.content,
            change_note=f"回滚到版本 {body.version}",
            created_by=当前用户.get("用户ID"),
        )
        db.add(snapshot)

    # 恢复内容，设置版本号
    prompt.content = target.content
    prompt.version = body.version

    await db.commit()
    await db.refresh(prompt)
    return prompt


# ==================== Prompt Templates ====================


@router.get("/prompt-templates", response_model=Page[PromptTemplateResponse])
async def list_prompt_templates(
    category: str | None = Query(None, description="按分类筛选"),
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页条数"),
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.读取)),
):
    """获取提示词模板列表（分页），支持按分类筛选"""
    base_query = select(PromptTemplate)
    count_base = select(func.count()).select_from(PromptTemplate)

    if category:
        base_query = base_query.where(PromptTemplate.category == category)
        count_base = count_base.where(PromptTemplate.category == category)

    total = (await db.execute(count_base)).scalar() or 0

    query = base_query.order_by(PromptTemplate.name).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    items = list(result.scalars().all())

    return page_from_query(PromptTemplateResponse, items, total, page, page_size)


@router.post(
    "/prompt-templates",
    response_model=PromptTemplateResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_prompt_template(
    data: PromptTemplateCreate,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.创建)),
):
    """创建提示词模板"""
    template = PromptTemplate(
        name=data.name,
        category=data.category,
        content=data.content,
        is_preset=data.is_preset,
        created_by=当前用户.get("用户ID"),
    )
    db.add(template)
    await db.commit()
    await db.refresh(template)
    return template


@router.put("/prompt-templates/{template_id}", response_model=PromptTemplateResponse)
async def update_prompt_template(
    template_id: int,
    data: PromptTemplateUpdate,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.更新)),
):
    """更新提示词模板"""
    result = await db.execute(select(PromptTemplate).where(PromptTemplate.id == template_id))
    template = result.scalar_one_or_none()
    if not template:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="模板不存在")

    if data.name is not None:
        template.name = data.name
    if data.category is not None:
        template.category = data.category
    if data.content is not None:
        template.content = data.content
    if data.is_preset is not None:
        template.is_preset = data.is_preset

    await db.commit()
    await db.refresh(template)
    return template


@router.delete("/prompt-templates/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_prompt_template(
    template_id: int,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.删除)),
):
    """删除提示词模板"""
    result = await db.execute(select(PromptTemplate).where(PromptTemplate.id == template_id))
    template = result.scalar_one_or_none()
    if not template:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="模板不存在")

    await db.delete(template)
    await db.commit()


# ==================== Few-shot Examples ====================


@router.get("/fewshot", response_model=Page[FewShotResponse])
async def list_fewshot_examples(
    agent_key: str | None = Query(None, description="按 Agent 标识筛选"),
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页条数"),
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.读取)),
):
    """获取 Few-shot 示例列表（分页），支持按 Agent 筛选"""
    base_query = select(FewShotExample)
    count_base = select(func.count()).select_from(FewShotExample)

    if agent_key:
        base_query = base_query.where(FewShotExample.agent_key == agent_key)
        count_base = count_base.where(FewShotExample.agent_key == agent_key)

    total = (await db.execute(count_base)).scalar() or 0

    query = (
        base_query.order_by(FewShotExample.sort_order, FewShotExample.id)
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    result = await db.execute(query)
    items = list(result.scalars().all())

    return page_from_query(FewShotResponse, items, total, page, page_size)


@router.post(
    "/fewshot",
    response_model=FewShotResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_fewshot_example(
    data: FewShotCreate,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.创建)),
):
    """创建 Few-shot 示例"""
    example = FewShotExample(
        agent_key=data.agent_key,
        input_text=data.input_text,
        output_text=data.output_text,
        description=data.description,
        sort_order=data.sort_order,
    )
    db.add(example)
    await db.commit()
    await db.refresh(example)
    return example


@router.put("/fewshot/{example_id}", response_model=FewShotResponse)
async def update_fewshot_example(
    example_id: int,
    data: FewShotUpdate,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.更新)),
):
    """更新 Few-shot 示例"""
    result = await db.execute(select(FewShotExample).where(FewShotExample.id == example_id))
    example = result.scalar_one_or_none()
    if not example:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="示例不存在")

    if data.input_text is not None:
        example.input_text = data.input_text
    if data.output_text is not None:
        example.output_text = data.output_text
    if data.description is not None:
        example.description = data.description
    if data.sort_order is not None:
        example.sort_order = data.sort_order

    await db.commit()
    await db.refresh(example)
    return example


@router.delete("/fewshot/{example_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_fewshot_example(
    example_id: int,
    db: AsyncSession = Depends(get_db),
    当前用户: dict = Depends(检查权限(操作.删除)),
):
    """删除 Few-shot 示例"""
    result = await db.execute(select(FewShotExample).where(FewShotExample.id == example_id))
    example = result.scalar_one_or_none()
    if not example:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="示例不存在")

    await db.delete(example)
    await db.commit()
