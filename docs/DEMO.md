# 🎭 在线 Demo 说明

> **入口：<https://snow-sakura.github.io/novel-generator/>** ｜ 源码：[`demo/`](../demo/) ｜ 部署：[.github/workflows/deploy-pages.yml](../.github/workflows/deploy-pages.yml)

---

## 1. Demo 是什么

番茄小说生成器 V3 的**可交互在线复刻**：完整还原「种子句 → 四智能体流式生成 → 记录管理 → 导出」的产品流程，用于**免安装体验**。它是当前项目实现的静态投影——交互、页面、状态流转与真实 V3 前端一致，生成引擎为本地模拟。

## 2. 「全部用 GitHub 实现」拆解

| 要求 | 实现 | 位置 |
|------|------|------|
| 域名/托管全部用 GitHub | GitHub Pages：`snow-sakura.github.io/novel-generator` | GitHub Pages（Actions 源） |
| 发布自动化 | GitHub Actions：`push demo/** → deploy-pages` | `.github/workflows/deploy-pages.yml` |
| 数据记录 | 浏览器 **localStorage**（`tomato.demo.records.v1` / `tomato.demo.config.v1`），可导出 JSON 数据记录 | `demo/assets/app.js` 的 `Store` |
| Demo 代码 | 仓库纯静态目录，无构建链 | `demo/index.html + assets/` |

## 3. 功能对照表

| 页面 | 能力 | 数据流向 |
|------|------|----------|
| 创作工坊 | 种子句 + 频道/题材/风格/章节数/美学/叙事开关；示例种子 | 表单 → 生成引擎 |
| 生成面板 | Parser→Outliner→Writer→Titler 四段流式日志、状态灯、进度条 | 引擎 → DOM 打字机 |
| 对话创作 | 多轮引导收集需求 + 状态看板 | 对话 → 配置回填 |
| 我的作品 | 卡片列表、阅读/删除/清空、**导出全部记录 JSON** | localStorage ↔ UI |
| 作品详情 | 章节渲染、TXT/Markdown 导出、复制全文 | localStorage → Blob 下载 |
| 提示词模板 | 6 类种子模板一键使用 | 模板 → 表单 |
| 模型配置 | 5 家 Provider 配置演示 | Key 即时掩码 → localStorage |

## 4. 模拟生成引擎原理

1. `extractElements(seed)`：产出六维要素（人物/时间/地点/起因/发展/结局）；
2. Outliner：随机章节表 + 提纲文本；
3. Writer：段落模板池 × 要素占位符填充（每段标注 *Demo 模拟正文*），逐段 `await sleep` 打字机输出模拟 SSE；
4. Titler：书名模板组合；
5. 记录结构：`{ id, title, seed, channel, genres[], style, chapters[{n,title,content}], wordCount, createdAt }`。

## 5. 与真实版的差异（诚实声明）

| 维度 | Demo | 真实 V3 |
|------|------|---------|
| 正文来源 | 本地模板引擎 | LLM（OpenCode Zen 等） |
| 存储 | localStorage | SQLite 三表 + 文件系统 |
| 流式 | 定时器打字机 | 真 SSE 推送 |
| 导出 | TXT/MD/JSON | +PDF/EPUB/ZIP/大纲(XMind) |
| F11-F13 | 未包含 | TTS/AI 配图/统计分析 |

## 6. 二次开发

```bash
git clone <本仓库> && cd novel-generator/demo
python3 -m http.server 8899      # 本地预览 http://localhost:8899
# 修改后提交 → Actions 自动重新发布到 github.io
```

- 新增页面：仿照现有 `<section class="page" id="page-xxx">` + `go('xxx')` 路由；
- 换主题：`assets/style.css` 顶部 CSS 变量；
- 接真实 API：替换 `generate()` 中的模拟循环为 `fetch/SSE` 即可（UI 层不需改动）。
