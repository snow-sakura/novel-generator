# 🗂️ novel-build-system 文档索引

> 番茄小说生成器（V1/V2/V3）的**分版本规格文档**目录。顶层全套文档（需求/架构/操作/部署/安全/Demo）见 [../../docs/README.md](../../docs/README.md)。

## 目录结构

```
docs/
├── README.md          # 本索引
├── prd/               # 产品需求（分版本）
│   ├── PRD-v1.md      # 骨架版：四智能体管线 / SSE / 导出
│   ├── PRD-v2.md      # 血肉版：润色 / 段落版本（已并入 V3）
│   ├── PRD-v3.md      # 灵魂版：F1-F13 全功能
│   └── tts-system-api-doc.md   # TTS 子系统 API 文档
└── spec/              # 技术规格（分版本）
    ├── API-v1.md / API-v2.md / API-v3.md      # REST + SSE 接口
    ├── DB-v1.md / DB-v2.md / DB-v3.md         # SQLite 数据模型
    └── DESIGN-v1.md / DESIGN-v3.md            # 模块与流程设计
```

## 阅读路线

| 你想了解 | 读这里 |
|----------|--------|
| 产品是什么、全流程怎么走（带截图） | [../../README.md](../../README.md) |
| 当前需求全貌 | [../../docs/PRD.md](../../docs/PRD.md) → 细化到 `prd/PRD-v3.md` |
| 架构与技术决策 | [../../docs/ARCHITECTURE.md](../../docs/ARCHITECTURE.md) → 细化到 `spec/DESIGN-v3.md` |
| 接口联调 | `spec/API-v3.md`（V3，`/api/v3/*`；V1 为 `/api/v1/*`） |
| 数据库 | `spec/DB-v3.md` |
| 操作手册 | [../../docs/USER-GUIDE.md](../../docs/USER-GUIDE.md) |
| 在线 Demo | [../../docs/DEMO.md](../../docs/DEMO.md) · <https://snow-sakura.github.io/novel-generator/> |

## 约定与勘误

- `prd/`、`spec/` 描述的 **`docs/novel/{title}/` 为运行时产物目录**（小说正文/xmind/大纲），2026-10-18 起已从 Git 移除并 .gitignore，文档中的路径语义仍指运行时位置；
- V2 文档保留作历史参考（功能冻结于 v2.1.0）；
- AI 生成内容、截图等隐私/大体积产物一律不入库（见 [../../docs/SECURITY.md](../../docs/SECURITY.md)）。
