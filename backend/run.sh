#!/usr/bin/env bash
set -e

# 自动激活虚拟环境
if [ ! -d ".venv" ]; then
    echo "🔧 首次运行，创建虚拟环境..."
    python3 -m venv .venv
fi

source .venv/bin/activate

# 检查依赖是否安装
if ! python -c "import fastapi" 2>/dev/null; then
    echo "📦 安装依赖..."
    pip install -r requirements.txt
fi

# 检查 .env 是否存在
if [ ! -f ".env" ]; then
    echo "⚠️  未发现 .env 文件，从 .env.example 复制..."
    cp .env.example .env 2>/dev/null || true
fi

echo "🚀 启动后端服务: http://localhost:${PORT:-8000}"
python -m app.main
