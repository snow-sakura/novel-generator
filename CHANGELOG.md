# 更新日志

本项目所有值得注意的变更都记录在此文件。
格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [Unreleased]

### Added
- v3 前端 E2E 离线化：`tests/mock-server.mjs`（静态 dist + `/api/v3` fixture），92 用例无需后端全绿；9 个过时用例对齐 v3.1 UI；新增 CI 工作流 `e2e.yml`
- **v1 冒烟离线 CI 化**：`v1/tests/mock-server.mjs` + `e2e-v1.yml`，pytest-playwright **11 passed / 1 skipped**（零后端/零密钥）；5 个过时用例对齐 v1.6 四区块展开式表单
- GitHub Issue / PR 模板（Bug / 功能 / Demo 快捷入口 / 自检清单）
- CHANGELOG.md（本文件）与 README.en.md 英文版

## [release-2026.10.18] - 2026-10-18

### Added
- **在线 Demo 上线**（GitHub Pages + Actions 自动发布，localStorage 数据记录，四智能体流程模拟）→ <https://snow-sakura.github.io/novel-generator/>
- 顶层文档体系 `docs/`：PRD、架构、操作说明、部署、安全、Demo、索引 + Playwright 自动截图 9 张
- 根 README 重写：9 步全流程（主副标题 + 文字 + 截图 + Demo 链接）
- `LICENSE`（MIT）、`novel-build-test/README.md`（AISQA 入口）、`novel-build-system/docs/README.md`（分版本文档索引）
- **Docker 一键部署**：v1/v3 前后端 4 镜像 + `docker-compose.yml`（V1 :3001 / V3 :3003）+ `.dockerignore`
- **CI**：`deploy-pages`（Demo 发布）、`security-scan`（gitleaks 全历史 + 工作区禁入文件/硬编码 Key 门禁）、`docker`（compose 校验 + 镜像构建）、`e2e`（离线 Playwright）
- v1 新增 **AGNES 模型 Provider** 与配置管理增强（2026-10-16，v1.6.1）

### Changed
- v2 README 标注冻结归档并修正启动命令；v3 README 截图/Demo/测试导航更新
- v1/v2/v3 的 AGENT/AGENTS/CLAUDE.md 补注「docs/novel/ 为运行时产物，不入 Git」

### Removed
- 已跟踪的 AI 生成小说内容 `docs/novel/`（177 文件）、旧版截图、临时分析报告、无关 SHOP 文档（-18k 行）

### Security
- `.gitignore` 加固（backups/、*.bak、*.sqlite3）；确认 `.env`/`*.db` 从未入库；历史 53 提交 gitleaks 验证零泄露

## [v3.1.1] - 2026-08-29

### Fixed / Security / Performance
- 前端代码去重（LABEL_MAP/STEP_CONFIG/常量共享）、后端死代码清理
- CORS localhost 白名单、API Key 响应脱敏、请求体 10MB、DB 索引 ×4、全局异常处理、SSE 独立 session
- 8 项 Bug 修复（级联删除、N+1、session 失效、版本/配置错误等）
- XSS 防护 + 无障碍 + 审计 11 项修复；V3 favicon 🍅；V1 错误处理终止流水线 + AGNES 前置工作

## [v1.5.0 ~ v1.6.0] - 2026-08-28 ~ 08-31

- V1 全面优化：UI/UX、SSE 透传修复、模型配置持久化（ConfigStatus 恢复）、Key 脱敏、取消保护、DB 索引
- V3 E2E 测试套件（Playwright 6 spec / 92 用例）+ 前端性能优化

## [v3.0.0 / v1.2~v1.4] - 2026-07-05 ~ 07-22

- v3.0.0 灵魂版：频道/题材/风格多选、叙事技巧、金句、美学、解读、设定档案、多版本开头（F1-F9）
- V1：番茄分类 + 国产模型 + 逐章导出 + 大纲思维导图（XMind）+ TOC + 生成日志持久化 + 继续生成
- AISQA（novel-build-test）v1.x 独立开发：TS 迁移、Polaroid 主题、6+ 业务模块 CRUD、文档体系

## [v1.0.0] - 2026-07-05

- 初始版本：四智能体管线（Parser/Outliner/Writer/Titler）+ SSE 流式生成 + 多格式导出
