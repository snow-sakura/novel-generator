# 番茄小说生成智能体 V2 — 数据库文档

## 数据库信息

| 项目 | 内容 |
|------|------|
| 类型 | SQLite 3 |
| 文件路径 | `backend/novel_generator_v2.db`（相对路径，运行后端时自动创建） |
| ORM | SQLAlchemy 2.0 |
| 连接方式 | `sqlite:///./novel_generator_v2.db` |
| 迁移管理 | V2 使用 `Base.metadata.create_all()` 自动建表，无迁移脚本 |
| 数据导出 | 直接拷贝 `backend/novel_generator_v2.db` 即可备份 |

**开发环境连接方式：**
```bash
sqlite3 backend/novel_generator_v2.db
```

---

## 表结构

### novels — 小说主表

V2 将所有小说数据存储在单表中（与 V1 相同）。

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

---

### generation_records — 生成记录表

记录每次生成的状态，支持失败继续（与 V1 相同）。

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

---

### model_configs — 模型配置表

持久化前端模型配置（与 V1 相同）。

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

---

### prompt_templates — Prompt 模板表

存储 Prompt 模板备份（与 V1 相同）。

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

### paragraph_versions — 段落版本表（V2 新增）

存储段落润色的版本历史，支持重写/扩写/精简操作。

```sql
CREATE TABLE paragraph_versions (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    novel_id        INTEGER NOT NULL,
    chapter_index   INTEGER NOT NULL,
    paragraph_index INTEGER NOT NULL,
    action          VARCHAR(20) NOT NULL,
    content         TEXT NOT NULL,
    version         INTEGER NOT NULL,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (novel_id) REFERENCES novels(id)
);
```

#### 字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER | 自增主键 |
| novel_id | INTEGER | 关联 novels 表 |
| chapter_index | INTEGER | 章节索引（从 0 开始） |
| paragraph_index | INTEGER | 段落索引（从 0 开始） |
| action | VARCHAR(20) | 操作类型：rewrite / expand / compress |
| content | TEXT | 润色后的内容 |
| version | INTEGER | 版本号（1/2/3，循环覆盖） |
| created_at | DATETIME | 创建时间 |

#### 使用说明

- 每个段落最多保留 3 个版本（version 1/2/3 循环覆盖）
- 同一操作类型（如 rewrite）会覆盖旧版本
- 不同操作类型（rewrite vs expand）保留各自版本

---

## V1 与 V2 表结构对比

| 表名 | V1 | V2 |
|------|----|----|
| novels | ✅ | ✅ |
| generation_records | ✅ | ✅ |
| model_configs | ✅ | ✅ |
| prompt_templates | ✅ | ✅ |
| paragraph_versions | ❌ | ✅ (新增) |

---

## 常用查询

### 1. 查询所有小说（按时间倒序）

```sql
SELECT id, title, genre, actual_count, created_at
FROM novels
ORDER BY created_at DESC;
```

### 2. 查询段落版本历史

```sql
SELECT pv.*, n.title
FROM paragraph_versions pv
JOIN novels n ON pv.novel_id = n.id
WHERE pv.novel_id = ? AND pv.chapter_index = ? AND pv.paragraph_index = ?
ORDER BY pv.version DESC;
```

### 3. 查询指定小说的所有润色记录

```sql
SELECT pv.chapter_index, pv.paragraph_index, pv.action, pv.version, pv.created_at
FROM paragraph_versions pv
WHERE pv.novel_id = ?
ORDER BY pv.chapter_index, pv.paragraph_index, pv.version;
```

---

## 数据清理

### 通过 API 清理（推荐）

```bash
# 清理孤立数据（无主记录 + 无效小说）
curl -X POST http://localhost:8000/api/v2/cleanup

# 重置卡住的 in_progress 记录
curl -X POST http://localhost:8000/api/v2/records/{id}/reset
```

### 通过 SQL 清理（手动）

```sql
-- 删除所有小说（慎用）
DELETE FROM novels;
DELETE FROM paragraph_versions;

-- 清理孤立的段落版本记录
DELETE FROM paragraph_versions
WHERE novel_id NOT IN (SELECT id FROM novels);
```

---

## 常见问题

### Q: 如何清理"生成中..."的无效小说？

A: 调用 `POST /api/v2/cleanup` 接口，或在前端历史记录页面点击"清理无效数据"按钮。

### Q: 记录卡在 `in_progress` 状态怎么办？

A: 调用 `POST /api/v2/records/{id}/reset` 将其重置为 `failed`，然后可以重新生成或继续生成。

### Q: 段落版本历史如何工作？

A: 每次对段落执行润色（重写/扩写/精简）时，系统会保存新版本。每个段落最多保留 3 个版本，超出时循环覆盖最旧的版本。
