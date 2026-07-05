# AGENT.md — AI 开发助手指南

此文档为 AI 编程助手（Claude Code / Cursor 等）提供项目上下文，帮助理解代码结构和开发规范。

## 项目本质

这是一个**番茄小说风格的 AI 小说生成器**，对标番茄小说平台的题材分类体系。核心流程：

```
用户输入种子句
  → 选择频道(男频/女频) → 题材 → 风格 → 字数
  → 后端三步生成(要素解析 → 大纲 → 逐章)
  → SSE 流式推送前端
  → 自动存储到 novel/ 文件夹
```

## 技术要点

### 后端
- **FastAPI** + **SSE**: `StreamingResponse(text/event-stream)`
- **Provider 工厂**: `app/llm/provider.py` 支持动态创建任意 OpenAI 兼容模型
- **生成管线**: `app/services/generator.py` 三步 yield 事件
- **文件存储**: 自动创建 `novel/{title}/` 文件夹，存储逐章 TXT + 大纲思维导图
- **番茄数据**: `app/data.py` 硬编码男频19类/女频18类/15种风格

### 前端
- **状态管理**: Zustand store (`novelStore.js`) 管理所有生成状态
- **Demo 模式**: 自动检测 `github.io`，切换 mock 数据流
- **章节锚点**: 每个 `<section id="ch-N">` 支持 `scrollIntoView`
- **TOC**: 侧栏目录面板控制 `showToc` 状态

### 关键路由

| 端点 | 说明 |
|------|------|
| POST `/api/v1/generate` | SSE 流式生成 |
| GET `/api/v1/models/list` | 国产模型列表 |
| GET `/api/v1/genres/list?gender=` | 题材列表（按频道） |
| GET `/api/v1/novels/{id}/export` | 全文导出 (md/txt/pdf) |
| GET `/api/v1/novels/{id}/export/chapters` | 逐章 ZIP |
| GET `/api/v1/novels/{id}/export/outline` | 大纲思维导图 |

### SSE 事件类型

parse / parse_done / outline / outline_thinking / outline_done / chapter_start / content / chapter_end / title / log / complete / error

### 新增字段（v1.1）

- `gender`: 男频/女频
- `per_chapter_min/max`: 每章字数范围
- `outline`: 大纲 JSON（含 elements + chapters）
- `model_config`: 自定义模型配置 JSON

## 开发规范

1. **新增字段**需同步修改: model → router → store → api → 组件
2. **SSE 事件**新增需同步: generator yield → store event → CreatePage switch
3. **文档**更新: TODO.md(版本记录) + DESIGN/API/DB 规格文档
4. **Demo 模式**: sampleNovel.js 需维护 mock 数据
