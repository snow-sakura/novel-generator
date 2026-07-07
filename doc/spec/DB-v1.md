# 番茄小说生成智能体 V1 — 数据库文档

## 数据库信息

| 项目 | 内容 |
|------|------|
| 类型 | SQLite 3 |
| 文件路径 | `backend/novel_generator.db`（相对路径，运行后端时自动创建） |
| ORM | SQLAlchemy 2.0 |
| 连接方式 | `sqlite:///./novel_generator.db` |
| 迁移管理 | V1 使用 `Base.metadata.create_all()` 自动建表，无迁移脚本 |
| 数据导出 | 直接拷贝 `backend/novel_generator.db` 即可备份 |

**开发环境连接方式：**
```bash
sqlite3 backend/novel_generator.db
```

---

## 表结构

### novels — 小说主表

V1 将所有小说数据存储在单表中。

```sql
CREATE TABLE novels (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    title       TEXT NOT NULL DEFAULT '未命名小说',
    seed_text   TEXT NOT NULL,
    gender      VARCHAR(10) DEFAULT '男频',
    genre       TEXT NOT NULL,
    style       TEXT NOT NULL,
    word_count  INTEGER NOT NULL DEFAULT 3000,
    per_chapter_min INTEGER DEFAULT 800,
    per_chapter_max INTEGER DEFAULT 2500,
    actual_count INTEGER NOT NULL DEFAULT 0,
    content     TEXT NOT NULL DEFAULT '',
    chapters    TEXT NOT NULL DEFAULT '[]',
    outline     TEXT DEFAULT '',
    model_used  TEXT NOT NULL DEFAULT '',
    model_config TEXT DEFAULT '{}',
    time_cost   REAL NOT NULL DEFAULT 0.0,
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

#### 字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER | 自增主键 |
| title | TEXT | AI 生成的小说标题 |
| seed_text | TEXT | 用户输入的种子句 |
| gender | VARCHAR(10) | 频道：男频/女频 |
| genre | TEXT | 题材分类 |
| style | TEXT | 写作风格 |
| word_count | INTEGER | 用户请求的目标字数 |
| per_chapter_min | INTEGER | 每章最少字数 |
| per_chapter_max | INTEGER | 每章最多字数 |
| actual_count | INTEGER | 实际生成的字符数（含中英文） |
| content | TEXT | 完整小说 Markdown 文本 |
| chapters | TEXT | JSON 数组，每项 `{ title, summary }` |
| outline | TEXT | 大纲 JSON（六层结构） |
| model_used | TEXT | 生成所用的模型标识 |
| model_config | TEXT | 自定义模型配置 JSON |
| time_cost | REAL | 总生成耗时（秒） |
| created_at | DATETIME | 创建时间，默认当前时间 |

#### content 字段存储示例

```markdown
## 第一章 发光的书

林墨从未想过，自己在图书馆的兼职会遇到这样的怪事。
那天傍晚，夕阳透过蒙尘的玻璃窗...
```

---

### generation_records — 生成记录表

记录每次生成的状态，支持失败继续。

```sql
CREATE TABLE generation_records (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    novel_id          INTEGER,
    params            TEXT DEFAULT '{}',
    completed_chapters INTEGER DEFAULT 0,
    total_chapters    INTEGER DEFAULT 0,
    status            VARCHAR(20) DEFAULT 'in_progress',
    content_sofar     TEXT DEFAULT '',
    error_message     TEXT DEFAULT '',
    thinking_logs     TEXT DEFAULT '[]',
    chapter_states    TEXT DEFAULT '[]',
    seed_text         TEXT DEFAULT '',
    created_at        DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at        DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (novel_id) REFERENCES novels(id)
);
```

#### 字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER | 自增主键 |
| novel_id | INTEGER | 关联 novels 表（可为空） |
| params | TEXT | 生成参数 JSON |
| completed_chapters | INTEGER | 已完成的章节数 |
| total_chapters | INTEGER | 目标章节数 |
| status | VARCHAR(20) | in_progress / completed / failed / cancelled |
| content_sofar | TEXT | 已生成的内容（最多 50000 字符） |
| error_message | TEXT | 失败原因 |
| thinking_logs | TEXT | 生成日志列表 JSON |
| chapter_states | TEXT | 每章生成状态 JSON |
| seed_text | TEXT | 用户输入的种子句 |
| created_at | DATETIME | 创建时间 |
| updated_at | DATETIME | 更新时间 |

---

### model_configs — 模型配置表

持久化前端模型配置。

```sql
CREATE TABLE model_configs (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    provider    VARCHAR(50) NOT NULL DEFAULT 'opencode',
    label       VARCHAR(100) DEFAULT '',
    base_url    VARCHAR(500) DEFAULT '',
    model_id    VARCHAR(100) DEFAULT '',
    api_key     TEXT DEFAULT '',
    is_default  BOOLEAN DEFAULT 1,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER | 自增主键 |
| provider | VARCHAR(50) | Provider 名称 |
| label | VARCHAR(100) | 显示名称 |
| base_url | VARCHAR(500) | API 地址 |
| model_id | VARCHAR(100) | 模型 ID |
| api_key | TEXT | API Key |
| is_default | BOOLEAN | 是否默认配置 |
| created_at | TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | 更新时间 |

---

### prompt_templates — Prompt 模板表（预留）

存储 Prompt 模板备份。

```sql
CREATE TABLE prompt_templates (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    name     VARCHAR(50) NOT NULL,
    label    VARCHAR(100) DEFAULT '',
    content  TEXT DEFAULT '',
    version  VARCHAR(20) DEFAULT 'v1'
);
```

---

## 常用查询

### 1. 查询所有小说（按时间倒序）

```sql
SELECT id, title, genre, actual_count, created_at
FROM novels
ORDER BY created_at DESC;
```

### 2. 按题材统计

```sql
SELECT genre, COUNT(*) as count, AVG(actual_count) as avg_words
FROM novels
GROUP BY genre;
```

### 3. 搜索小说标题

```sql
SELECT id, title, seed_text
FROM novels
WHERE title LIKE '%关键词%' OR seed_text LIKE '%关键词%';
```

### 4. 查询字数达标率

```sql
SELECT
    COUNT(*) as total,
    SUM(CASE WHEN actual_count >= word_count * 0.8 THEN 1 ELSE 0 END) as qualified,
    ROUND(AVG(actual_count * 1.0 / word_count), 2) as avg_ratio
FROM novels;
```

### 5. 导出全文

```sql
SELECT title, content FROM novels WHERE id = ?;
```

---

## 数据清理

### 通过 API 清理（推荐）

```bash
# 清理孤立数据（无主记录 + 无效小说）
curl -X POST http://localhost:8000/api/v1/cleanup

# 重置卡住的 in_progress 记录
curl -X POST http://localhost:8000/api/v1/records/{id}/reset
```

### 通过 SQL 清理（手动）

```sql
-- 删除所有小说（慎用）
DELETE FROM novels;

-- 删除指定日期之前的数据
DELETE FROM novels WHERE created_at < '2026-01-01';

-- 清理孤立的 in_progress 记录（无 novel_id，超过 30 分钟）
DELETE FROM generation_records
WHERE novel_id IS NULL AND status = 'in_progress'
AND updated_at < datetime('now', '-30 minutes');

-- 清理"生成中..."小说
DELETE FROM generation_records WHERE novel_id IN (
    SELECT id FROM novels WHERE title = '生成中...' OR title LIKE '%生成中断%'
);
DELETE FROM novels WHERE title = '生成中...' OR title LIKE '%生成中断%';

-- 重置自增 ID（仅当表为空时有效）
DELETE FROM sqlite_sequence WHERE name='novels';
```

---

## 清理 API

除了手动 SQL 清理，项目提供自动清理接口：

### `POST /api/v1/cleanup`

自动清理以下数据：
1. **孤立记录**：`in_progress` 状态超过 30 分钟且无 `novel_id` 的记录
2. **无效小说**：标题为"生成中..."或包含"生成中断"的小说
3. **空记录**：`completed` 状态但无 `novel_id` 的记录

### `POST /api/v1/records/{id}/reset`

将卡住的 `in_progress` 记录重置为 `failed`，允许用户重新生成。

---

## 常见问题

### Q: 如何清理"生成中..."的无效小说？

A: 调用 `POST /api/v1/cleanup` 接口，或在前端历史记录页面点击"清理无效数据"按钮。

### Q: 记录卡在 `in_progress` 状态怎么办？

A: 调用 `POST /api/v1/records/{id}/reset` 将其重置为 `failed`，然后可以重新生成或继续生成。
