# 番茄小说生成智能体 V1 — API 文档

## 基本信息

- **Base URL:** `http://localhost:8000`
- **API 前缀:** `/api/v1`
- **数据格式:** JSON
- **字符编码:** UTF-8
- **认证方式:** V1 暂不启用

---

## 1. 生成小说 — `POST /api/v1/generate`

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
| genre | string | 是 | 题材，可选值：玄幻/都市/悬疑/言情/科幻/历史 |
| style | string | 是 | 风格，可选值：简洁直白/文艺抒情/幽默诙谐/冷峻写实 |
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

### 完整 SSE 流示例

```
event: log
data: "📝 正在分析故事要素..."

event: parse
data: "正在分析故事要素..."

event: parse_done
data: {"character":"林墨","time":"现代","place":"废弃图书馆","cause":"发现发光书","process":"探索秘密","result":"改变命运"}

event: log
data: "✅ 要素分析完成"

event: log
data: "📐 正在规划章节大纲..."

event: outline
data: "正在规划章节大纲..."

event: outline_done
data: [{"title":"第一章 发光的书","summary":"..."},{"title":"第二章 秘密","summary":"..."}]

event: log
data: "✅ 大纲规划完成：共 4 章"

event: log
data: "✍️ 开始逐章生成（共 4 章）..."

event: chapter_start
data: {"title":"第一章 发光的书","index":0}

event: content
data: "林墨从未想过..."

event: chapter_end
data: {"title":"第一章 发光的书","word_count":1024}

event: log
data: "✅ 第一章完成（1024 字）"

...

event: log
data: "🎉 全部完成！总字数 3120，耗时 45.2s"

event: complete
data: {"novel_id":1,"title":"光之书","total_words":3120,"time_cost":45.2}
```

---

## 2. 获取小说详情 — `GET /api/v1/novels/{id}`

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

### 错误响应

```json
{ "detail": "小说不存在" }
```
状态码: 404

---

## 3. 历史列表 — `GET /api/v1/novels?page=1&size=10`

### 查询参数

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| page | int | 1 | 页码，从 1 开始 |
| size | int | 10 | 每页条数 |

### 响应

```json
{
  "total": 25,
  "page": 1,
  "size": 10,
  "items": [
    {
      "id": 1,
      "title": "光之书",
      "seed_text": "一个少年在废弃图书馆发现了一本会发光的书",
      "genre": "玄幻",
      "style": "简洁直白",
      "word_count": 3000,
      "actual_count": 3120,
      "model_used": "OpenCodeProvider",
      "time_cost": 45.2,
      "created_at": "2026-07-05T12:00:00"
    }
  ]
}
```

---

## 4. 导出小说 — `GET /api/v1/novels/{id}/export?format=markdown`

### 查询参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| format | string | 是 | 导出格式：`markdown` / `txt` / `pdf` |

### 响应

- **markdown:** `Content-Type: text/markdown; charset=utf-8`，文件下载
- **txt:** `Content-Type: text/plain; charset=utf-8`，文件下载
- **pdf:** `Content-Type: application/pdf`，文件下载

文件名使用 RFC 5987 `filename*=UTF-8''` 格式，支持中文文件名。

---

## 5. 删除小说 — `DELETE /api/v1/novels/{id}`

### 响应

- 成功: 204 No Content
- 失败: 404 `{ "detail": "小说不存在" }`

---

## 6. 配置检查 — `GET /api/v1/config/check`

### 响应

```json
{
  "provider": "opencode",
  "configured": true,
  "error": "",
  "model": "mimo-v2.5-free"
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| provider | string | 当前使用的 Provider 名称 |
| configured | bool | 配置是否有效 |
| error | string | 错误信息，为空则无错 |
| model | string | 使用的模型名称 |

该接口在页面加载时自动调用，用于决定是否启用生成按钮。

---

## 7. 清理无效数据 — `POST /api/v1/cleanup`

清理孤立的生成记录和无效小说数据。

### 请求体

无（空请求）

### 响应

```json
{
  "status": "ok",
  "cleaned": {
    "orphaned_records": 5,
    "orphaned_novels": 3,
    "failed_novels": 2
  }
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| status | string | 操作状态 |
| cleaned.orphaned_records | int | 清理的孤立记录数 |
| cleaned.orphaned_novels | int | 清理的无效小说数 |
| cleaned.failed_novels | int | 清理的失败记录数 |

---

## 8. 重置记录状态 — `POST /api/v1/records/{id}/reset`

将卡在 `in_progress` 状态的记录重置为 `failed`，允许用户重新生成。

### 路径参数

| 参数 | 类型 | 说明 |
|------|------|------|
| id | int | 记录 ID |

### 响应

```json
{
  "status": "failed",
  "id": 36
}
```

### 错误响应

- 404: `{ "detail": "记录不存在" }`
- 400: `{ "detail": "只有进行中的记录可以重置" }`

---

## 9. 获取模型配置 — `GET /api/v1/model-config`

获取持久化的模型配置。

### 响应

```json
{
  "provider": "opencode-mimo",
  "label": "MiMo V2.5 (小米，限免)",
  "base_url": "https://opencode.ai/zen/v1",
  "model_id": "mimo-v2.5-free",
  "api_key": ""
}
```

---

## 10. 保存模型配置 — `PUT /api/v1/model-config`

保存模型配置到数据库。

### 请求体

```json
{
  "provider": "opencode-mimo",
  "label": "MiMo V2.5 (小米，限免)",
  "base_url": "https://opencode.ai/zen/v1",
  "model_id": "mimo-v2.5-free",
  "api_key": ""
}
```

### 响应

```json
{ "status": "ok" }
```

---

## 11. 国产模型列表 — `GET /api/v1/models/list`

返回所有可用的国产模型配置列表。

### 响应

```json
{
  "models": [
    {
      "provider": "opencode-mimo",
      "label": "MiMo V2.5 (小米，限免)",
      "base_url": "https://opencode.ai/zen/v1",
      "models": [{"id": "mimo-v2.5-free", "label": "MiMo V2.5 Free (限免)"}],
      "need_key": false
    },
    ...
  ]
}
```

---

## 12. 题材列表 — `GET /api/v1/genres/list?gender=男频`

获取指定频道的题材列表。

### 查询参数

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| gender | string | 男频 | 频道：`男频` / `女频` |

### 响应

```json
{
  "gender": "男频",
  "genres": ["西方奇幻", "东方仙侠", "科幻末世", ...],
  "styles": ["轻松搞笑", "热血激昂", "甜宠温馨", ...]
}
```
