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
    genre       TEXT NOT NULL,
    style       TEXT NOT NULL,
    word_count  INTEGER NOT NULL DEFAULT 3000,
    actual_count INTEGER NOT NULL DEFAULT 0,
    content     TEXT NOT NULL DEFAULT '',
    chapters    TEXT NOT NULL DEFAULT '[]',
    model_used  TEXT NOT NULL DEFAULT '',
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
| genre | TEXT | 题材分类 |
| style | TEXT | 写作风格 |
| word_count | INTEGER | 用户请求的目标字数 |
| actual_count | INTEGER | 实际生成的字符数（含中英文） |
| content | TEXT | 完整小说 Markdown 文本 |
| chapters | TEXT | JSON 数组，每项 `{ title, summary }` |
| model_used | TEXT | 生成所用的模型标识 |
| time_cost | REAL | 总生成耗时（秒） |
| created_at | DATETIME | 创建时间，默认当前时间 |

#### content 字段存储示例

```markdown
## 第一章 发光的书

林墨从未想过，自己在图书馆的兼职会遇到这样的怪事。
那天傍晚，夕阳透过蒙尘的玻璃窗...
```

---

### generation_logs — 生成日志表（预留）

V1 已定义模型，但未在生成流程中写入数据。

```sql
CREATE TABLE generation_logs (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    novel_id          INTEGER NOT NULL,
    prompt_tokens     INTEGER NOT NULL DEFAULT 0,
    completion_tokens INTEGER NOT NULL DEFAULT 0,
    status            TEXT NOT NULL DEFAULT 'success',
    error_msg         TEXT,
    created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (novel_id) REFERENCES novels(id)
);
```

#### 字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER | 自增主键 |
| novel_id | INTEGER | 关联 novels 表 |
| prompt_tokens | INTEGER | Prompt 消耗的 tokens 数 |
| completion_tokens | INTEGER | 生成消耗的 tokens 数 |
| status | TEXT | success / failed |
| error_msg | TEXT | 失败时的错误信息 |
| created_at | DATETIME | 记录时间 |

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

```sql
-- 删除所有小说（慎用）
DELETE FROM novels;

-- 删除指定日期之前的数据
DELETE FROM novels WHERE created_at < '2026-01-01';

-- 重置自增 ID（仅当表为空时有效）
DELETE FROM sqlite_sequence WHERE name='novels';
```
