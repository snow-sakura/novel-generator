#!/usr/bin/env bash
# ============================================================
# AISQA 开发模式启动脚本
# 使用 SQLite，无需外部数据库依赖
# ============================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log_info()  { echo -e "${CYAN}[INFO]${NC}  $1"; }
log_ok()    { echo -e "${GREEN}[OK]${NC}    $1"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC}  $1"; }

# ==================== 后端启动 ====================

start_backend() {
    log_info "设置后端环境..."
    cd backend
    
    # 创建虚拟环境
    if [ ! -d "venv" ]; then
        log_info "创建 Python 虚拟环境..."
        python3 -m venv venv
    fi
    
    source venv/bin/activate
    
    # 安装依赖
    log_info "安装后端依赖..."
    pip install -r requirements.txt --quiet 2>/dev/null || pip install -r requirements.txt
    
    # 初始化数据库
    log_info "初始化数据库..."
    python init_data.py
    
    # 启动服务
    log_info "启动后端服务 (端口 8000)..."
    uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload &
    BACKEND_PID=$!
    
    cd "$SCRIPT_DIR"
    echo $BACKEND_PID > .backend.pid
    
    log_ok "后端服务已启动"
}

# ==================== 前端启动 ====================

start_frontend() {
    log_info "设置前端环境..."
    cd frontend
    
    # 安装依赖
    if [ ! -d "node_modules" ]; then
        log_info "安装前端依赖..."
        npm install --silent
    fi
    
    # 启动服务
    log_info "启动前端服务 (端口 5173)..."
    npm run dev &
    FRONTEND_PID=$!
    
    cd "$SCRIPT_DIR"
    echo $FRONTEND_PID > .frontend.pid
    
    log_ok "前端服务已启动"
}

# ==================== 主入口 ====================

main() {
    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}  AISQA 平台开发模式启动${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""
    
    start_backend
    sleep 2
    start_frontend
    
    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}  服务已启动!${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""
    echo -e "  ${CYAN}前端地址:${NC}  http://localhost:5173"
    echo -e "  ${CYAN}后端API:${NC}   http://localhost:8000/api/v1"
    echo -e "  ${CYAN}API文档:${NC}   http://localhost:8000/docs"
    echo ""
    echo -e "  ${YELLOW}管理员账号:${NC}"
    echo -e "    用户名: admin"
    echo -e "    密码: admin123"
    echo ""
    echo -e "  ${YELLOW}按 Ctrl+C 停止所有服务${NC}"
    echo ""
    
    # 等待任一进程退出
    trap "kill $(cat .backend.pid 2>/dev/null) $(cat .frontend.pid 2>/dev/null) 2>/dev/null; rm -f .backend.pid .frontend.pid; exit" SIGINT SIGTERM
    wait
}

main "$@"
