# 🔐 数据安全与隐私配置

> 更新日期：2026-10-18 ｜ 原则：**密钥只存在于运行环境，绝不进入 Git；用户数据只存本地**

---

## 1. 敏感数据清单与处置

| 数据 | 存放位置 | 是否入 Git | 防护 |
|------|----------|-----------|------|
| LLM API Key（OpenCode / OpenAI / DeepSeek / AGNES 等） | `*/backend/.env`、数据库 `model_configs` | ❌ `.env` 被 ignore；DB 的 `*.db` 被 ignore | API 响应掩码 `sk-***`；GET 配置脱敏 |
| `.env.example` | 仓库 | ✅ 仅占位符（`sk-xxx`），无真实值 | 评审时禁止写入真实 Key |
| SQLite DB / 备份 | `*.db`、`backups/`、`*spare_backups/` | ❌ 已 ignore | 文件级自管 |
| AI 生成小说正文（txt/xmind/大纲） | `novel-build-system/docs/novel/` | ❌ 目录整体 ignore（ newcom 内容不再入库） | 2026-10-18 已从历史记录工作区清理 |
| Demo 作品/配置 | 访问者浏览器 localStorage | ❌ 不上传任何服务器 | Demo 零网络请求 |
| IDE/工具缓存 | `.idea/`、`.workbuddy/`、`.pytest_cache/` 等 | ❌ 已 ignore | — |

## 2. `.gitignore` 防线（本仓库现行规则）

```gitignore
.env / .env.*            # 所有环境变量文件
*.db / dump.rdb          # 数据库
qdrant_storage/ vector_db/
node_modules/ .venv/ dist/
.idea/ .DS_Store *.log
novel-build-system/docs/novel/     # AI 生成内容（含隐私创作数据）
novel-build-system/.workbuddy/
test-results/ .pytest_cache/       # 测试产物
**/review_findings.json 等          # 报告产物
backups/ *.bak *spare_backups/      # 备份（2026-10-18 新增）
.opencode/ .mimocode/
```

## 2.1 CI 强制门禁（自动执行）

[.github/workflows/security-scan.yml](../.github/workflows/security-scan.yml) 在每次 push / PR / 每周一自动运行：

| 检查 | 工具 | 规则 |
|------|------|------|
| 全量 Git 历史密钥扫描 | gitleaks v8（配置 [.gitleaks.toml](../.gitleaks.toml)） | 命中真实密钥 → CI 失败 |
| 工作区文件门禁 | 脚本 | 跟踪文件出现 `.env` / `*.db` / `backups/` → CI 失败 |
| 硬编码 Key 检查 | 脚本 | `sk-[24位以上]`（排除占位符）→ CI 失败 |

> 历史已验证：53 个提交零密钥泄露，门禁自启用之日起为绿。

## 2.2 手动验证（提交前）

```bash
git ls-files | grep -E '\.env$|\.db$|secrets?/'          # 应为空
git grep -nE "sk-[A-Za-z0-9]{20,}"                        # 应为空（排除 sk-xxx 等占位符）
```

## 3. 运行时安全（后端）

- CORS：仅 localhost allowlist（v3.1.1 起移除通配符）
- 输入：请求体 ≤ 10MB；Pydantic 严格校验
- 输出：模型配置接口 Key 一律掩码返回；XSS 防护（审计 9e2de76）
- 错误：全局异常处理器，统一 JSON，不泄漏堆栈
- SSE：独立 session，防断连资源泄漏

## 4. Demo 隐私边界

- 无后端、无分析、无 Cookie 域；**不发送任何网络请求**；
- 「模型配置」保存时即时转掩码存储（不保存原文 Key）；
- 所有作品数据存储 `localStorage`（键 `tomato.demo.*`），清除浏览器数据即彻底删除。

## 5. 泄露应急

1. 若真实 Key 曾被提交：立即在服务商侧**吊销/轮换**；
2. 清理历史：`git filter-repo --invert-paths --path <file>` + 强推 + GitHub 工单清缓存；
3. 复盘：把该路径加入 `.gitignore` 并在 CI 增加密钥扫描（gitleaks/trufflehog 均可）。

> AISQA 平台的 MySQL/Redis/Qdrant 凭据同样遵循 `.env` 规则，docker-compose 通过环境变量注入，不写死。
