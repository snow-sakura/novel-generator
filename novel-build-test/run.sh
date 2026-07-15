#!/usr/bin/env bash
# ============================================================
# AISQA 平台一键启动脚本 (4.2.2)
# 用法:
#   ./run.sh              # 完整启动（Docker + 前端 + 后端）
#   ./run.sh --dev        # 开发模式（本地启动前后端，需自行启动 MySQL/Redis/Qdrant）
#   ./run.sh --docker     # 仅 Docker 服务（MySQL + Redis + Qdrant）
#   ./run.sh --help       # 帮助信息
# ============================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

log_info()  { echo -e "${CYAN}[INFO]${NC}  $1"; }
log_ok()    { echo -e "${GREEN}[OK]${NC}    $1"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC}  $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# ==================== 环境检查 ====================

check_dependencies() {
    local missing=false

    if ! command -v docker &>/dev/null; then
        log_error "Docker 未安装。请先安装 Docker: https://docs.docker.com/get-docker/"
        missing=true
    fi

    if ! command -v python3 &>/dev/null; then
        log_error "Python3 未安装。"
        missing=true
    fi

    if ! command -v node &>/dev/null; then
        log_warn "Node.js 未安装。前端需要在本地运行。"
    fi

    if [ "$missing" = true ]; then
        exit 1
    fi
}

# ==================== 环境文件检查 ====================

check_env_file() {
    if [ ! -f backend/.env ]; then
        log_warn "backend/.env 不存在，从 .env.example 复制..."
        cp backend/.env.example backend/.env
        log_info "请编辑 backend/.env 配置 API Key 和数据库密码"
    fi
}

# ==================== Docker 部署模式 ====================

start_docker() {
    log_info "启动 Docker 全栈服务..."
    docker compose up -d
    log_ok "Docker 服务已启动"
    echo ""
    echo -e "  ${GREEN}Backend API:${NC}  http://localhost:8000/api/v1/health"
    echo -e "  ${GREEN}MCP Server:${NC}   http://localhost:8001/mcp/health"
    echo -e "  ${GREEN}Frontend:${NC}     http://localhost:3000"
    echo -e "  ${GREEN}Qdrant:${NC}       http://localhost:6333"
    echo ""
}

stop_docker() {
    log_info "停止 Docker 服务..."
    docker compose down
    log_ok "Docker 服务已停止"
}

# ==================== 开发模式 ====================

start_dev() {
    check_env_file

    # 后端
    log_info "启动后端 (端口 8000)..."
    cd backend
    if [ ! -d venv ]; then
        log_info "创建 Python 虚拟环境..."
        python3 -m venv venv
    fi
    source venv/bin/activate
    pip install -r requirements.txt --quiet
    uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload &
    BACKEND_PID=$!
    cd "$SCRIPT_DIR"

    # 前端
    log_info "启动前端 (端口 5173)..."
    cd frontend
    npm install --silent
    npm run dev &
    FRONTEND_PID=$!
    cd "$SCRIPT_DIR"

    log_ok "开发环境已启动"
    echo ""
    echo -e "  ${GREEN}Backend:${NC}  http://localhost:8000/api/v1/health"
    echo -e "  ${GREEN}Frontend:${NC} http://localhost:5173"
    echo ""
    echo -e "  ${YELLOW}按 Ctrl+C 停止所有服务${NC}"
    echo ""

    # 等待任一进程退出
    trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" SIGINT SIGTERM
    wait
}

# ==================== 仅 Docker 基础设施 ====================

start_infra() {
    log_info "启动基础设施 (MySQL + Redis + Qdrant)..."
    docker compose up -d mysql redis qdrant
    log_ok "基础设施已启动"
    echo ""
    echo -e "  ${GREEN}MySQL:${NC}  localhost:3306"
    echo -e "  ${GREEN}Redis:${NC}  localhost:6379"
    echo -e "  ${GREEN}Qdrant:${NC} localhost:6333"
    echo ""
}

# ==================== 主入口 ====================

main() {
    case "${1:-}" in
        --dev)
            check_dependencies
            start_dev
            ;;
        --docker)
            check_dependencies
            check_env_file
            start_docker
            ;;
        --stop)
            stop_docker
            ;;
        --infra)
            check_dependencies
            start_infra
            ;;
        --help|-h)
            echo "AISQA 平台启动脚本"
            echo ""
            echo "用法:"
            echo "  ./run.sh             完整 Docker 启动"
            echo "  ./run.sh --dev       开发模式（本地）"
            echo "  ./run.sh --docker    仅 Docker 全栈"
            echo "  ./run.sh --infra     仅 Docker 基础设施（MySQL/Redis/Qdrant）"
            echo "  ./run.sh --stop      停止 Docker 服务"
            echo ""
            ;;
        *)
            check_dependencies
            check_env_file
            start_docker
            ;;
    esac
}

main "$@"
