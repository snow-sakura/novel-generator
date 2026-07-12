# 番茄小说生成智能体 V3 — API 文档

## 基本信息

- **Base URL:** `http://localhost:8000`
- **API 前缀:** `/api/v3`
- **数据格式:** JSON
- **字符编码:** UTF-8
- **认证方式:** V3 暂不启用
- **SSE 编码:** `text/event-stream`，`event: xxx\ndata: {...}\n\n`

---

## 目录

1. [生成小说](#1-生成小说--post-apiv3generate)
2. [继续生成](#2-继续生成--post-apiv3generatecontinue)
3. [多版本开头对比](#3-多版本开头对比--post-apiv3generateopenings)
4. [AI 推荐主题](#4-ai-推荐主题--post-apiv3themesuggest)
5. [获取小说详情](#5-获取小说详情--get-apiv3novelsid)
6. [更新设定档案](#6-更新设定档案--patch-apiv3novelsidbible)
7. [更新情感曲线](#7-更新情感曲线--patch-apiv3novelsidemotion-curve)
8. [插入段落](#8-插入段落--post-apiv3paragraphsinsert)
9. [导出](#9-导出)
10. [生成记录](#10-生成记录)
11. [角色对话生成](#11-角色对话生成--post-apiv3dialoguegenerate)
12. [写作助手](#12-写作助手)
13. [段落润色](#13-段落润色--post-apiv3refine)
14. [AI 配图](#14-ai-配图)
15. [TTS 语音合成](#15-tts-语音合成)
16. [金句提取](#16-金句提取--get-apiv3quotesnovel_id)
17. [统计分析](#17-统计分析--post-apiv3analysisnovel_id)
18. [配置与数据](#18-配置与数据)

---

## 1. 生成小说 — `POST /api/v3/generate`

### 请求体

```json
{
  "seed_text": "一个程序员在深夜加班时发现自己写的代码能改变现实",
  "gender": "男频",
  "genre": "都市脑洞",
  "style": "轻松搞笑",
  "word_count": 3000,
  "per_chapter_min": 800,
  "per_chapter_max": 2500,
  "pov": "第三人称有限",
  "pacing": "标准型",
  "style_intensity": "中度",
  "enable_suspense": true,
  "enable_twist": true,
  "theme": "成长",
  "aesthetic_intensity": "中度",
  "ending_type": "",
  "llm_config": null
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| seed_text | string | 是 | 种子句，1-200 字 |
| gender | string | 否 | 男频/女频，默认男频 |
| genre | string | 否 | 题材（按频道筛选） |
| style | string | 否 | 风格（支持 `+` 拼接多选） |
| word_count | int | 否 | 目标字数 500-500000 |
| per_chapter_min | int | 否 | 每章最少字数 |
| per_chapter_max | int | 否 | 每章最多字数 |
| chapter_count | int | 否 | 指定章节数（可选） |
| pov | string | 否 | 第一人称/第三人称有限/上帝视角 |
| pacing | string | 否 | 紧凑型/标准型/舒缓型 |
| style_intensity | string | 否 | 轻度/中度/重度 |
| enable_suspense | bool | 否 | 启用悬念 |
| enable_twist | bool | 否 | 启用反转 |
| theme | string | 否 | 核心主题 |
| aesthetic_intensity | string | 否 | 关闭/轻度/中度/重度 |
| ending_type | string | 否 | 好结局/坏结局/开放式 |
| opening_text | string | 否 | 已选开头文本（F7 对比模式续生） |
| llm_config | object | 否 | 自定义模型配置 |
| custom_prompts | object | 否 | 覆盖默认 Prompt |

### SSE 事件类型

| 事件名 | 触发时机 | data 格式 |
|--------|----------|-----------|
| `record_id` | 开始生成 | `{ id }` |
| `log` | 思考日志 | `{ step, type, text }` |
| `parse` | 要素解析中 | `"状态描述"` |
| `parse_done` | 解析完成 | `{ character, time, place, cause, process, result }` |
| `outline` | 大纲规划中 | `"状态描述"` |
| `outline_thinking` | 每层大纲 | `{ index, title, summary }` |
| `outline_done` | 大纲完成 | `{ chapters, outline }` |
| `emotion_curve` | 情感曲线生成 | `[{ chapter, phase, emotion, intensity, label }]` |
| `chapter_start` | 开始单章 | `{ title, index, start_time }` |
| `content` | 流式文本块 | `"文本块"` |
| `chapter_end` | 单章完成 | `{ title, word_count, emotion }` |
| `title` | 标题生成中 | `"状态描述"` |
| `interpretation` | 文末解读 | `"解读文本"` |
| `complete` | 全部完成 | `{ novel_id, title, total_words, time_cost }` |
| `error` | 出错 | `{ message }` |

---

## 2. 继续生成 — `POST /api/v3/generate/continue?record_id=X`

从失败/取消点继续生成。参数同 `POST /api/v3/generate`，`record_id` 为必填。

---

## 3. 多版本开头对比 — `POST /api/v3/generate/openings`

生成 2-5 个不同视角×节奏组合的开头版本供用户选择。

### 请求体

```json
{
  "seed_text": "一个程序员在深夜加班时发现自己写的代码能改变现实",
  "gender": "男频",
  "genre": "都市脑洞",
  "style": "轻松搞笑",
  "word_count": 3000,
  "pov": "第三人称有限",
  "pacing": "标准型"
}
```

### SSE 事件

| 事件 | data 格式 |
|------|-----------|
| `opening_version` | `{ label, pov, pacing, desc, tag, text }` |
| `openings_done` | `{ openings: [...] }` |
| `error` | `{ message }` |

---

## 4. AI 推荐主题 — `POST /api/v3/theme/suggest`

### 请求体

```json
{
  "seed_text": "一个程序员在深夜加班时发现自己写的代码能改变现实",
  "genre": "都市脑洞",
  "style": "轻松搞笑"
}
```

### 响应

```json
{ "theme": "成长" }
```

---

## 5. 获取小说详情 — `GET /api/v3/novels/{id}`

### 响应

```json
{
  "id": 1,
  "title": "代码成神",
  "seed_text": "一个程序员在深夜加班时发现自己写的代码能改变现实",
  "gender": "男频",
  "genre": "都市脑洞",
  "style": "轻松搞笑",
  "word_count": 3000,
  "actual_count": 3215,
  "content": "## 第一章 深夜邮件\n\n...",
  "chapters": "[...]",
  "outline": "{...}",
  "theme": "成长",
  "emotion_curve": "[...]",
  "aesthetic_intensity": "中度",
  "interpretation": "这篇故事讲述的是...",
  "character_bible": "{\"characters\": [...]}",
  "illustrations": "[]",
  "model_used": "opencode",
  "time_cost": 45.2,
  "created_at": "2026-07-10T12:00:00"
}
```

### 新增 V3 字段

| 字段 | 类型 | 说明 |
|------|------|------|
| theme | string | 核心主题 |
| emotion_curve | text | 情感曲线 JSON |
| aesthetic_intensity | string | 美学强度 |
| interpretation | text | 文末解读 |
| character_bible | text | 设定档案 JSON |
| illustrations | text | AI 配图 JSON |

---

## 6. 更新设定档案 — `PATCH /api/v3/novels/{id}/bible`

### 请求体

```json
{
  "characters": [
    { "name": "陈默", "role": "主角", "traits": "聪明、执着", "description": "28岁程序员" }
  ],
  "locations": [],
  "world_rules": [],
  "key_items": [],
  "timeline": []
}
```

---

## 7. 更新情感曲线 — `PATCH /api/v3/novels/{id}/emotion-curve`

### 请求体

```json
{
  "curve": [
    { "chapter": 1, "phase": "起", "emotion": "好奇", "intensity": 2, "label": "深夜收到邮件" }
  ]
}
```

---

## 8. 插入段落 — `POST /api/v3/paragraphs/insert`

### 请求体

```json
{
  "novel_id": 1,
  "chapter_index": 0,
  "paragraph_index": 3,
  "content": "> *每一个深夜敲下的代码，都是写给未来的情书。*"
}
```

---

## 9. 导出

| 端点 | 说明 |
|------|------|
| `GET /api/v3/novels/{id}/export?format=md` | 全文 Markdown |
| `GET /api/v3/novels/{id}/export?format=txt` | 全文 TXT |
| `GET /api/v3/novels/{id}/export?format=pdf` | 全文 PDF |
| `GET /api/v3/novels/{id}/export/chapters` | 逐章 ZIP |
| `GET /api/v3/novels/{id}/export/outline?format=markdown` | 大纲 Markdown |
| `GET /api/v3/novels/{id}/export/outline?format=xmind` | 大纲 XMind |

---

## 10. 生成记录

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/v3/records` | GET | 分页列表 |
| `/api/v3/records/{id}` | GET | 记录详情 |
| `/api/v3/records/{id}/status` | GET | 轻量状态轮询 |
| `/api/v3/records/{id}/cancel` | POST | 标记为 cancelled |
| `/api/v3/records/{id}/reset` | POST | 重置为 failed |
| `/api/v3/records/{id}` | DELETE | 删除记录 |
| `/api/v3/cleanup` | POST | 清理孤立数据 |

---

## 11. 角色对话生成 — `POST /api/v3/dialogue/generate`

### 请求体

```json
{
  "characters": [
    { "name": "陈默", "traits": "聪明、执着", "description": "28岁程序员" }
  ],
  "scenario": "主角和反派在决战前的对峙"
}
```

### SSE 事件

| 事件 | data 格式 |
|------|-----------|
| `dialogue_content` | `{ text }` |

---

## 12. 写作助手

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/v3/assist/continue` | POST | 续写，SSE 流式 |
| `/api/v3/assist/rewrite` | POST | 智能改写，SSE 流式 |

---

## 13. 段落润色 — `POST /api/v3/refine`

### 请求体

```json
{
  "paragraph": "原文段落...",
  "context": "章节上下文...",
  "action": "rewrite",
  "instruction": "让语气更轻松一些"
}
```

| 字段 | 说明 |
|------|------|
| action | rewrite / expand / compress / insert_quote |

### 版本历史

`GET /api/v3/refine/versions?novel_id=X&chapter_index=Y&paragraph_index=Z`

---

## 14. AI 配图

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/v3/illustrations/generate` | POST | 生成配图 |
| `/api/v3/illustrations/{novel_id}` | GET | 获取所有配图 |
| `/api/v3/illustrations/{novel_id}/{chapter_index}` | DELETE | 删除配图 |

---

## 15. TTS 语音合成

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/v3/tts/voices` | GET | 可用声优列表 |
| `/api/v3/tts/generate` | POST | 生成单章音频 |
| `/api/v3/tts/generate_all` | POST | 全本生成 |
| `/api/v3/tts/audio/{novel_id}/{chapter_index}` | GET | 获取音频文件 |
| `/api/v3/tts/status/{novel_id}` | GET | 生成状态 |
| `/api/v3/tts/{novel_id}/{chapter_index}` | DELETE | 删除音频 |

---

## 16. 金句提取 — `GET /api/v3/quotes/{novel_id}`

### 响应

```json
{
  "novel_id": 1,
  "novel_title": "代码成神",
  "stats": { "total_quotes": 6, "chapters_with_quotes": 3, "total_chapters": 4, "coverage": "3/4" },
  "chapters": [
    {
      "chapter_index": 0,
      "chapter_title": "第一章 深夜邮件",
      "quotes": [{ "id": 0, "text": "每一个深夜敲下的代码，都是写给未来的情书。" }]
    }
  ]
}
```

---

## 17. 统计分析 — `POST /api/v3/analysis/{novel_id}`

### 响应

```json
{
  "word_frequency": [{ "word": "陈默", "count": 18 }],
  "char_appearances": [{ "name": "陈默", "per_chapter": [5, 3, 4, 6], "total": 18 }],
  "basic_stats": { "total_words": 3215, "chapter_count": 4, "chapter_word_counts": [850, 780, 920, 665], "reading_time_min": 8, "chapter_titles": ["第一章 深夜邮件"] },
  "emotion_curve": [{ "chapter": 1, "phase": "起", "emotion": "好奇", "intensity": 2 }]
}
```

---

## 18. 配置与数据

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/v3/config/check` | GET | 配置检查 |
| `/api/v3/models/list` | GET | 国产模型列表 |
| `/api/v3/genres/list?gender=` | GET | 题材列表 |
| `/api/v3/model-config` | GET | 获取持久化模型配置 |
| `/api/v3/model-config` | PUT | 保存模型配置 |
