# 番茄小说生成智能体 V2 — API 文档

## 基本信息

- **Base URL:** `http://localhost:8000`
- **API 前缀:** `/api/v2`
- **数据格式:** JSON
- **字符编码:** UTF-8
- **认证方式:** V2 暂不启用

> **版本标识**: V2 API 前缀为 `/api/v2`，与 V1 的 `/api/v1` 区分

---

## 1. 生成小说 — `POST /api/v2/generate`

### 请求体

```json
{
  "seed_text": "一个少年在废弃图书馆发现了一本会发光的书",
  "genre": "玄幻",
  "style": "简洁直白",
  "word_count": 3000
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| seed_text | string | 是 | 用户输入的种子句，1-200 字 |
| genre | string | 是 | 题材 |
| style | string | 是 | 风格 |
| word_count | int | 是 | 目标字数，范围 500-50000 |

### 响应格式

SSE (Server-Sent Events) 流式响应，`Content-Type: text/event-stream`。

### SSE 事件类型

| 事件名 | 触发时机 | data 格式 |
|--------|----------|-----------|
| `parse` | 开始要素解析 | `"string"` 状态描述 |
| `parse_done` | 要素解析完成 | `{ character, time, place, cause, process, result }` |
| `outline` | 开始大纲规划 | `"string"` 状态描述 |
| `outline_done` | 大纲规划完成 | `[{ title, summary }]` 章节数组 |
| `chapter_start` | 开始生成某章 | `{ title, index }` |
| `content` | 流式内容块 | `"string"` Markdown 文本块 |
| `chapter_end` | 单章生成完成 | `{ title, word_count }` |
| `title` | 开始生成标题 | `"string"` 状态描述 |
| `log` | 后端思考日志 | `"string"` 带时间戳和 emoji 的日志文本 |
| `complete` | 全部完成 | `{ novel_id, title, total_words, time_cost }` |
| `error` | 出错 | `{ message }` |

---

## 2. 获取小说详情 — `GET /api/v2/novels/{id}`

### 响应

```json
{
  "id": 1,
  "title": "光之书",
  "seed_text": "一个少年在废弃图书馆发现了一本会发光的书",
  "genre": "玄幻",
  "style": "简洁直白",
  "word_count": 3000,
  "actual_count": 3120,
  "content": "## 第一章 发光的书\n\n林墨从未想过...",
  "chapters": "[{\"title\":\"第一章 发光的书\",\"summary\":\"...\"}]",
  "model_used": "OpenCodeProvider",
  "time_cost": 45.2,
  "created_at": "2026-07-05T12:00:00"
}
```

---

## 3. 历史列表 — `GET /api/v2/novels?page=1&size=10`

### 查询参数

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| page | int | 1 | 页码，从 1 开始 |
| size | int | 10 | 每页条数 |

---

## 4. 导出小说 — `GET /api/v2/novels/{id}/export?format=markdown`

### 查询参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| format | string | 是 | 导出格式：`markdown` / `txt` / `pdf` |

---

## 5. 删除小说 — `DELETE /api/v2/novels/{id}`

---

## 6. 配置检查 — `GET /api/v2/config/check`

---

## 7. 清理无效数据 — `POST /api/v2/cleanup`

---

## 8. 重置记录状态 — `POST /api/v2/records/{id}/reset`

---

## 9. 获取模型配置 — `GET /api/v2/model-config`

---

## 10. 保存模型配置 — `PUT /api/v2/model-config`

---

## 11. 国产模型列表 — `GET /api/v2/models/list`

---

## 12. 题材列表 — `GET /api/v2/genres/list?gender=男频`

---

## 13. 段落润色 — `POST /api/v2/refine` (V2 新增)

对指定段落进行润色操作（重写/扩写/精简）。

### 请求体

```json
{
  "novel_id": 1,
  "chapter_index": 0,
  "paragraph_index": 2,
  "action": "rewrite",
  "content": "原始段落内容..."
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| novel_id | int | 是 | 小说 ID |
| chapter_index | int | 是 | 章节索引（从 0 开始） |
| paragraph_index | int | 是 | 段落索引（从 0 开始） |
| action | string | 是 | 操作类型：`rewrite` / `expand` / `compress` |
| content | string | 是 | 原始段落内容 |

### 响应格式

SSE 流式响应。

### SSE 事件类型

| 事件名 | 触发时机 | data 格式 |
|--------|----------|-----------|
| `content` | 流式润色内容 | `"string"` 润色后的文本块 |
| `complete` | 润色完成 | `{ version_id, action, version }` |
| `error` | 出错 | `{ message }` |

---

## 14. 获取段落版本历史 — `GET /api/v2/refine/versions` (V2 新增)

获取指定段落的版本历史。

### 查询参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| novel_id | int | 是 | 小说 ID |
| chapter_index | int | 是 | 章节索引 |
| paragraph_index | int | 是 | 段落索引 |

### 响应

```json
{
  "versions": [
    {
      "id": 1,
      "version": 1,
      "action": "rewrite",
      "content": "润色后的内容...",
      "created_at": "2026-07-07T12:00:00"
    }
  ]
}
```

---

## V1 与 V2 API 对比

| 端点 | V1 | V2 |
|------|----|----|
| POST `/api/v{N}/generate` | ✅ `/api/v1` | ✅ `/api/v2` |
| GET `/api/v{N}/novels` | ✅ `/api/v1` | ✅ `/api/v2` |
| GET `/api/v{N}/novels/{id}` | ✅ `/api/v1` | ✅ `/api/v2` |
| DELETE `/api/v{N}/novels/{id}` | ✅ `/api/v1` | ✅ `/api/v2` |
| GET `/api/v{N}/novels/{id}/export` | ✅ `/api/v1` | ✅ `/api/v2` |
| POST `/api/v{N}/cleanup` | ✅ `/api/v1` | ✅ `/api/v2` |
| POST `/api/v{N}/records/{id}/reset` | ✅ `/api/v1` | ✅ `/api/v2` |
| GET `/api/v{N}/model-config` | ✅ `/api/v1` | ✅ `/api/v2` |
| PUT `/api/v{N}/model-config` | ✅ `/api/v1` | ✅ `/api/v2` |
| GET `/api/v{N}/models/list` | ✅ `/api/v1` | ✅ `/api/v2` |
| GET `/api/v{N}/genres/list` | ✅ `/api/v1` | ✅ `/api/v2` |
| POST `/api/v{N}/refine` | ❌ | ✅ `/api/v2` (新增) |
| GET `/api/v{N}/refine/versions` | ❌ | ✅ `/api/v2` (新增) |
