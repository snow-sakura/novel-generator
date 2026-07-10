# 番茄小说生成智能体 V3 — 数据库文档

## 数据库信息

| 项目 | 内容 |
|------|------|
| 类型 | SQLite 3 |
| 文件路径 | `backend/novel_generator_v3.db`（相对路径，运行后端时自动创建） |
| ORM | SQLAlchemy 2.0 |
| 连接方式 | `sqlite:///./novel_generator_v3.db` |
| 迁移管理 | `migrate_database()` 启动时自动检测并 ALTER TABLE 新增列 |
| 数据导出 | 直接拷贝 `backend/novel_generator_v3.db` 即可备份 |

**开发环境连接方式：**
```bash
sqlite3 backend/novel_generator_v3.db
```

---

## 表结构

### novels — 小说主表

V3 在 V2 基础上新增 6 个字段（theme / emotion_curve / aesthetic_intensity / interpretation / character_bible / illustrations）。

```sql
CREATE TABLE novels (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    title               VARCHAR(255) DEFAULT '',
    seed_text           TEXT NOT NULL,
    gender              VARCHAR(10) DEFAULT '男频',
    genre               VARCHAR(50) DEFAULT '玄幻脑洞',
    style               VARCHAR(50) DEFAULT '轻松搞笑',
    word_count          INTEGER DEFAULT 3000,
    per_chapter_min     INTEGER DEFAULT 800,
    per_chapter_max     INTEGER DEFAULT 2500,
    actual_count        INTEGER DEFAULT 0,
    content             TEXT DEFAULT '',
    chapters            TEXT DEFAULT '[]',
    outline             TEXT DEFAULT '',
    model_used          VARCHAR(100) DEFAULT '',
    model_config        TEXT DEFAULT '{}',
    time_cost           REAL DEFAULT 0.0,
    theme               VARCHAR(50) DEFAULT '',
    emotion_curve       TEXT DEFAULT '',
    aesthetic_intensity VARCHAR(10) DEFAULT '中度',
    interpretation      TEXT DEFAULT '',
    character_bible     TEXT DEFAULT '{}',
    illustrations       TEXT DEFAULT '[]',
    created_at          DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### V3 新增字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| theme | VARCHAR(50) | 核心主题（如"成长""勇气""选择"），通过 AI 推荐或用户选择 |
| emotion_curve | TEXT | 情感曲线 JSON，每章一个数据点：[{chapter, phase, emotion, intensity, label}] |
| aesthetic_intensity | VARCHAR(10) | 美学强度：关闭 / 轻度 / 中度 / 重度 |
| interpretation | TEXT | 文末解读文本（F5 意义提炼） |
| character_bible | TEXT | 设定档案 JSON（F6 跨章节一致性）：{characters, locations, world_rules, ...} |
| illustrations | TEXT | AI 配图 JSON（F11）：[{chapter_index, prompt, url, generated_at}] |

---

### generation_records — 生成记录表

```sql
CREATE TABLE generation_records (
    id                 INTEGER PRIMARY KEY AUTOINCREMENT,
    novel_id           INTEGER,
    params             TEXT DEFAULT '{}',
    completed_chapters INTEGER DEFAULT 0,
    total_chapters     INTEGER DEFAULT 0,
    status             VARCHAR(20) DEFAULT 'in_progress',
    content_sofar      TEXT DEFAULT '',
    error_message      TEXT DEFAULT '',
    thinking_logs      TEXT DEFAULT '[]',
    chapter_states     TEXT DEFAULT '[]',
    seed_text          TEXT DEFAULT '',
    created_at         DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at         DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (novel_id) REFERENCES novels(id)
);
```

#### V3 新增字段（通过迁移脚本自动添加）

| 字段 | 说明 |
|------|------|
| thinking_logs | 生成日志 JSON，供前端 MultiStepLog 展示 |
| chapter_states | 每章生成状态 JSON：[{index, title, status, start_time, end_time}] |

---

### model_configs — 模型配置表

与 V1/V2 相同，持久化前端模型配置。

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

与 V1/V2 相同，存储 Prompt 模板备份。

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

### paragraph_versions — 段落版本表

存储段落润色的版本历史，支持 rewrite / expand / compress 操作，每段落最多 3 个版本（循环覆盖）。

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
| action | VARCHAR(20) | 操作类型：rewrite / expand / compress |
| version | INTEGER | 版本号 1/2/3，循环覆盖 |
| created_at | DATETIME | 创建时间 |

---

### generation_logs — 生成日志表

记录每次 LLM 调用的 Token 使用和状态。

```sql
CREATE TABLE generation_logs (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    novel_id         INTEGER NOT NULL,
    prompt_tokens    INTEGER DEFAULT 0,
    completion_tokens INTEGER DEFAULT 0,
    status           VARCHAR(20) DEFAULT 'success',
    error_msg        TEXT DEFAULT '',
    created_at       DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## V3 表结构对照

| 表名 | V1 | V2 | V3 |
|------|----|----|----|
| novels | ✅ | ✅ | ✅（+7 字段：theme, emotion_curve, aesthetic_intensity, interpretation, character_bible, illustrations, outline） |
| generation_records | ✅ | ✅ | ✅（+2 字段：thinking_logs, chapter_states） |
| model_configs | ✅ | ✅ | ✅ |
| prompt_templates | ✅ | ✅ | ✅ |
| paragraph_versions | ❌ | ✅ | ✅ |
| generation_logs | ❌ | ❌ | ✅（新增） |

---

## 常用查询

### 1. 查询所有小说（按时间倒序）

```sql
SELECT id, title, genre, theme, actual_count, created_at
FROM novels
ORDER BY created_at DESC;
```

### 2. 查询情感曲线数据

```sql
SELECT id, title, emotion_curve
FROM novels
WHERE emotion_curve IS NOT NULL AND emotion_curve != '';
```

### 3. 查询设有设定档案的小说

```sql
SELECT id, title, character_bible
FROM novels
WHERE character_bible IS NOT NULL AND character_bible != '{}';
```

### 4. 查询段落版本历史

```sql
SELECT pv.*, n.title
FROM paragraph_versions pv
JOIN novels n ON pv.novel_id = n.id
WHERE pv.novel_id = ? AND pv.chapter_index = ? AND pv.paragraph_index = ?
ORDER BY pv.version DESC;
```

### 5. 查询生成日志（Token 统计）

```sql
SELECT novel_id, SUM(prompt_tokens) AS total_prompt, SUM(completion_tokens) AS total_completion
FROM generation_logs
WHERE status = 'success'
GROUP BY novel_id;
```

---

## 数据清理

### 通过 API 清理（推荐）

```bash
# 清理孤立数据（无主记录 + 无效小说）
curl -X POST http://localhost:8000/api/v3/cleanup

# 重置卡住的 in_progress 记录
curl -X POST http://localhost:8000/api/v3/records/{id}/reset
```

### 通过 SQL 清理（手动）

```sql
-- 删除所有小说（慎用）
DELETE FROM novels;
DELETE FROM paragraph_versions;
DELETE FROM generation_logs;

-- 清理孤立的段落版本和日志
DELETE FROM paragraph_versions
WHERE novel_id NOT IN (SELECT id FROM novels);
DELETE FROM generation_logs
WHERE novel_id NOT IN (SELECT id FROM novels);
```

---

## 常见问题

### Q: 如何清理"生成中..."的无效小说？

A: 调用 `POST /api/v3/cleanup` 接口，或在前端历史记录页面点击"清理无效数据"按钮。

### Q: 记录卡在 `in_progress` 状态怎么办？

A: 调用 `POST /api/v3/records/{id}/reset` 将其重置为 `failed`，然后可以重新生成或继续生成。

### Q: V3 新增的 `character_bible` 和 `emotion_curve` 字段是做什么的？

A: `character_bible`（设定档案）用于跨章节人物一致性维护（F6）；`emotion_curve`（情感曲线）存储逐章情感分析数据，供前端可视化展示（F13）。

### Q: V3 数据库如何从 V1/V2 升级？

A: V3 使用独立的 `novel_generator_v3.db` 文件，与 V1/V2 完全隔离。启动时 `migrate_database()` 会自动为旧表添加缺失的列。
