# 🚢 部署与运维文档

> 更新日期：2026-10-18 ｜ 覆盖：GitHub Pages Demo、本地全栈、AISQA Docker 栈

---

## 1. 在线 Demo —— GitHub Pages（零成本，已上线）

### 1.1 发布链路

```
push main (改动 demo/**)
   └─▶ GitHub Actions: .github/workflows/deploy-pages.yml
         ├─ actions/checkout
         ├─ actions/configure-pages
         ├─ actions/upload-pages-artifact  (path: demo)
         └─ actions/deploy-pages
                └─▶ https://snow-sakura.github.io/novel-generator/
```

### 1.2 首次启用（一次性）

1. 仓库 Settings → Pages → Build and deployment → **Source: GitHub Actions**；
2. 推送任意 `demo/` 内改动或在 Actions 页手动 `Deploy Demo to GitHub Pages → Run workflow`；
3. 等待部署完成后访问上方域名。

> 若 Workflow 报 `Pages not enabled`，即为第 1 步未开启；开启后重跑即可。

### 1.3 更新 Demo

直接提交 `demo/` 内文件并推送到 `main`，Actions 自动重新发布（约 30s）。资源缓存通过 `?v=N` 版本号刷新（见 `demo/index.html`）。

## 2. 本地全栈（V1/V3）

```bash
# V3（推荐）
cd novel-build-system/v3/backend  && bash run.sh          # :8000 autobio: .env 缺失自动生成
cd novel-build-system/v3/frontend && npm i && npm run dev  # :5173

# V1
cd novel-build-system/v1/backend  && bash run.sh          # :8001
cd novel-build-system/v1/frontend && npm i && npm run dev
```

运维要点：

| 项 | 位置 / 方式 |
|----|-------------|
| 数据库 | `backend/novel_generator_v{1,3}.db`（SQLite，文件级备份即可） |
| 备份示例 | `backend/backups/`（已 gitignore，仅建议本地保留） |
| 日志 | uvicorn 控制台；生成事件日志前端可见 |
| 密钥 | `backend/.env`（详见 [SECURITY.md](SECURITY.md)） |
| 端口冲突 | v1=8001 / v3=8000 ↔ 前端代理见 `vite.config.*` |

## 3. AISQA（novel-build-test）

```bash
cd novel-build-test
docker compose up -d          # MySQL + Redis + Qdrant + backend + frontend
# 或本地开发：bash start-dev.sh
```

CI：`novel-build-test/.github/workflows/ci.yml`（后端 ruff+pytest，前端 lint+build）。

## 4. 环境矩阵

| 环境 | 地址 | 数据来源 |
|------|------|----------|
| Demo（生产） | snow-sakura.github.io/novel-generator | 访问浏览器 localStorage |
| 本地 V3 | localhost:5173 ↔ :8000 | SQLite |
| 本地 V1 | localhost:5173 ↔ :8001 | SQLite |
| AISQA | docker 栈 | MySQL/Redis/Qdrant |

## 5. 截图流水线（可选）

README/docs 中全部截图由 Playwright MCP 自动截取，复现方法：

```bash
python3 -m http.server 8899 --directory demo   # 起 Demo
# 用 Playwright（MCP 或脚本）打开 http://localhost:8899 ，
# 按 USER-GUIDE Part A 流程操作并截图保存到 docs/images/：
#   1440x900, scale=css，命名 demo-01-create … demo-09-settings
```
