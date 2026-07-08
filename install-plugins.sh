#!/bin/bash
# MiMoCode / Claude Code 插件批量安装脚本
# 在 MiMoCode 终端中运行此脚本，或复制命令逐条执行

echo "=========================================="
echo "  MiMoCode 插件批量安装"
echo "=========================================="
echo ""

# 定义所有要安装的插件
PLUGINS=(
  # 核心开发
  "commit-commands"
  "code-review"
  "feature-dev"
  "pr-review-toolkit"
  "code-simplifier"
  "code-modernization"
  # 安全与质量
  "security-guidance"
  "semgrep"
  "sonarqube"
  # 工具链
  "claude-md-management"
  "claude-code-setup"
  "hookify"
  "mcp-server-dev"
  "plugin-dev"
  "superpowers"
  # 代码搜索
  "greptile"
  "serena"
  "sourcegraph"
  # API 与测试
  "postman"
  "playwright"
  "codspeed"
  # 文档
  "context7"
  "microsoft-docs"
  "pydantic-ai"
  # LSP
  "typescript-lsp"
  "pyright-lsp"
  "gopls-lsp"
  "clangd-lsp"
  # 外部 MCP
  "github"
)

MARKETPLACE="claude-plugins-official"
TOTAL=${#PLUGINS[@]}
SUCCESS=0
FAILED=0

echo "共 $TOTAL 个插件待安装"
echo ""

for plugin in "${PLUGINS[@]}"; do
  echo -n "安装 $plugin ... "
  # 使用 mimo run 发送安装命令
  # 注意：这需要在 MiMoCode CLI 中运行
  echo "/plugin install ${plugin}@${MARKETPLACE}"
done

echo ""
echo "=========================================="
echo "  请复制上面的命令在 MiMoCode 终端中执行"
echo "  或者直接在 MiMoCode 中逐条粘贴运行"
echo "=========================================="
echo ""
echo "快速复制全部命令："
echo ""
for plugin in "${PLUGINS[@]}"; do
  echo "/plugin install ${plugin}@${MARKETPLACE}"
done
