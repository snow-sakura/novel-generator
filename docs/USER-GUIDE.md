# 🧭 操作说明（端到端使用手册）

> 更新日期：2026-10-18 ｜ 适用：在线 Demo + 本地 V3/V1
> 每一步都可在 **[在线 Demo](https://snow-sakura.github.io/novel-generator/)** 直接实操。

---

## Part A · 在线 Demo（3 分钟上手）

### A1. 打开 Demo
浏览器访问 👉 **https://snow-sakura.github.io/novel-generator/**
无需注册、无需安装、不联网调用任何服务。左侧导航五大功能：创作工坊 / 对话创作 / 我的作品 / 提示词模板 / 模型配置。

![创作工坊](images/demo-01-create.png)

### A2. 输入种子句 + 配置参数
在创作工坊左侧填写：

| 配置项 | 说明 | 默认 |
|--------|------|------|
| 种子句 | 一句话故事起点（可点示例种子快速填入） | 必填 |
| 频道 | 男频 / 女频 | 男频 |
| 题材（多选） | 玄幻/都市/科幻/悬疑/历史/武侠/仙侠/系统/穿越/无限流 | 无 |
| 风格 | 热血/搞笑/暗黑/治愈/爽文/文青 | 热血燃系 |
| 章节数 | 3 / 5 / 8 章 | 5 |
| 美学风格 | 关闭 / 轻 / 中 / 重 | 轻度 |
| 叙事开关 | 悬念 / 反转 / 多版本结局 | 开 |

![参数配置](images/demo-02-config.png)

### A3. （可选）改用对话创作
切到「对话创作」，直接对助手说想法，例如：
> 我想要一个赛博朋克风格的都市异能故事，主角是外卖员

助手会分轮拆解要素、确认节奏，右侧**状态看板**同步显示配置结果，确认后自动跳回创作工坊。

![对话创作](images/demo-07-chat.png)

### A4. 开始生成 → 观看四智能体流水线
点击「🚀 开始生成」。右侧依次点亮：

1. ParserAgent（六维要素）→ 2. OutlinerAgent（六层大纲）→ 3. WriterAgent（逐章流式）→ 4. TitlerAgent（书名）

日志区滚动显示每个 Agent 的「流式输出」，进度条实时推进。

![生成中](images/demo-03-generating.png)

### A5. 完成 → 自动入库
弹出完成卡片（书名/章数/字数）。记录已写入浏览器 localStorage——刷新页面、关闭浏览器都不会丢。

![完成](images/demo-04-done.png)

### A6. 管理作品（数据记录）
「我的作品」页每张卡片显示书名、种子句、标签、章数、字数、时间：

- **阅读** → 进入详情页
- **导出** → 单部 TXT
- **删除 / 清空** → 本地数据自管
- **📦 导出全部记录 JSON** → 完整数据记录备份（可跨设备迁移）

![作品库](images/demo-06-history.png)

### A7. 阅读与导出
详情页可 **导出 TXT / 导出 Markdown / 复制全文**。

![详情导出](images/demo-05-detail.png)

### A8. 模板与配置
- **提示词模板**：分类种子句一键填入创作工坊；
- **模型配置**：体验真实版的配置界面；保存后 Key 仅以 `sk-•••末3位` 掩码形式留在本机。

![模板](images/demo-08-prompts.png)
![配置](images/demo-09-settings.png)

---

## Part B · 本地完整部署（接入真实 LLM）

### B1. 环境
Python ≥ 3.10、Node ≥ 18、一个 API Key（推荐 OpenCode Zen 免费模型）。

### B2. 启动 V3
```bash
cd novel-build-system/v3/backend && bash run.sh     # 后端 :8000（自动建 venv/装依赖/复制_env）
cd novel-build-system/v3/frontend && npm install && npm run dev   # 前端 :5173
```

### B3. 配置模型
编辑 `backend/.env`（此文件已被 .gitignore 保护，绝不会提交）：

```env
LLM_PROVIDER=opencode
OPENCODE_API_KEY=sk-xxxx            # ← 只填在本机
OPENCODE_BASE_URL=https://opencode.ai/zen/v1
OPENCODE_MODEL=mimo-v2.5-free
```

或在 V3 前端「设置」弹窗内配置（保存后 Key 显示为掩码）。

### B4. 创作流程
打开 http://localhost:5173 → 与 Part A 相同的 9 步流程，区别是：
正文由真实 LLM 生成（不再是模板）；支持 断点续写 / PDF/EPUB/逐章ZIP 导出 / TTS / 配图 / 统计分析 / 设定档案。

### B5. 常见问题

| 现象 | 处理 |
|------|------|
| 生成报 `model_not_found / 503` | 换模型或换 Provider；确认 Key 额度 |
| 前端 404 代理错误 | 确认后端已启动且端口未被占用（v1=8001, v3=8000） |
| SSE 中断 | 使用记录列表「继续生成」断点续写 |
| 想迁移作品 | 详情页导出；或直接备份 `backend/*.db` |

> 更多：[README 快速开始](../README.md) ｜ [架构](ARCHITECTURE.md) ｜ [安全](SECURITY.md)
