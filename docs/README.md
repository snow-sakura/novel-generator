# 📚 文档总索引

> 本目录收录 novel-generator 大项目的**全套顶层文档**；各子项目的细粒度文档（分版本 PRD、API/DB/DESIGN 规格）位于 `novel-build-system/docs/` 与各子项目目录内。

## 顶层文档

| 文档 | 类型 | 适合谁 | 内容 |
|------|------|--------|------|
| [../README.md](../README.md) | 总览 + 全流程指南 | 所有人 | 项目简介、在线 Demo、9 步全流程（含截图）、快速开始 |
| [PRD.md](PRD.md) | **需求文档** | 产品 / 研发 | 产品定位、目标用户、用户故事、F1-F13 功能需求、非功能需求、验收标准 |
| [ARCHITECTURE.md](ARCHITECTURE.md) | **技术文档** | 研发 | 系统架构、四智能体管线、模块划分、API 设计、数据模型、关键技术决策 |
| [USER-GUIDE.md](USER-GUIDE.md) | **操作说明** | 终端用户 | 从打开 Demo 到导出成品的端到端操作手册 |
| [DEPLOYMENT.md](DEPLOYMENT.md) | 部署文档 | 运维 / 研发 | 本地部署、Docker、GitHub Pages 静态 Demo 发布流水线 |
| [SECURITY.md](SECURITY.md) | 安全文档 | 研发 / 安全 | 密钥管理、隐私数据边界、.gitignore 防线、已知风险清单 |
| [DEMO.md](DEMO.md) | Demo 文档 | 所有人 | 在线 Demo 实现原理、数据记录机制、与真实版差异 |

## 截图资源

全流程截图位于 [images/](images/)（由 Playwright 自动截取）：

| 文件 | 场景 |
|------|------|
| `images/demo-01-create.png` | 创作工坊初始界面 |
| `images/demo-02-config.png` | 种子句与创作参数配置 |
| `images/demo-03-generating.png` | 四智能体流式生成中 |
| `images/demo-04-done.png` | 生成完成弹窗 |
| `images/demo-05-detail.png` | 作品详情与导出 |
| `images/demo-06-history.png` | 我的作品（localStorage 数据记录） |
| `images/demo-07-chat.png` | 对话式创作 |
| `images/demo-08-prompts.png` | 提示词模板库 |
| `images/demo-09-settings.png` | 模型配置与数据安全 |

## 子项目文档地图

```
novel-generator/
├── README.md                        # 大项目总览（含全流程图文指南）
├── docs/                            # ← 本目录：顶层全套文档
├── demo/                            # GitHub Pages 在线 Demo（源码即站点）
├── novel-build-system/
│   ├── docs/
│   │   ├── prd/                     # 分版本 PRD：PRD-v1/v2/v3.md + TTS API 文档
│   │   └── spec/                    # 分版本规格：API/DB/DESIGN-v1..v3.md
│   ├── AGENT.md / AGENTS.md         # 三版本共用的 Agent 上下文（工作流/规则）
│   ├── v1/                          # 骨架版：README.md、CLAUDE.md、AGENT/AGENTS.md、TODO.md、tests/
│   ├── v2/                          # 血肉版：README.md 等（已冻结）
│   └── v3/                          # 灵魂版：README.md 等 + frontend/tests（Playwright E2E）
└── novel-build-test/                # AISQA 独立项目
    ├── README.md                    # AISQA 入口文档
    └── docs/                        # v0/v1 API、架构、部署、模块拆解、设计规范
```

> 版本口径：`docs/prd|spec` 中的 v1/v2/v3 与代码目录一一对应；顶层文档描述当前主线（v3.1.1 + v1.6.0 + Demo）。
