#!/usr/bin/env bash
# AISQA 测试执行入口 — 4.3: 集成&单元测试
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../../" && pwd)"
BACKEND_DIR="${ROOT_DIR}/backend"
VENV_DIR="${BACKEND_DIR}/.venv"

# 颜色
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

log()  { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
err()  { echo -e "${RED}[✗]${NC} $1"; }

# ---------- 1. 环境检查 ----------
check_env() {
  if [ ! -d "$VENV_DIR" ]; then
    warn "虚拟环境不存在，正在创建..."
    python3 -m venv "$VENV_DIR"
    source "${VENV_DIR}/bin/activate"
    pip install -r "${BACKEND_DIR}/requirements.txt" --quiet
    log "虚拟环境已创建"
  fi
}

# ---------- 2. 运行测试 ----------
run_tests() {
  source "${VENV_DIR}/bin/activate"

  # 默认参数：详细输出 + 覆盖率
  PYTEST_ARGS=(
    "-v"
    "--tb=short"
    "--asyncio-mode=auto"
  )

  # 如果安装了 pytest-cov，追加覆盖率
  if python -c "import pytest_cov" 2>/dev/null; then
    PYTEST_ARGS+=("--cov=app" "--cov-report=term-missing" "--cov-report=html:${BACKEND_DIR}/tests/coverage")
    log "启用覆盖率报告"
  fi

  # 从参数过滤（如果有额外参数，覆盖默认 PYTEST_ARGS）
  if [ $# -gt 0 ]; then
    PYTEST_ARGS=("$@")
  fi

  log "运行测试: pytest ${PYTEST_ARGS[*]}"
  cd "$BACKEND_DIR"

  if pytest "${PYTEST_ARGS[@]}"; then
    log "全部测试通过"
  else
    err "存在失败的测试"
    return 1
  fi
}

# ---------- 3. 主流程 ----------
main() {
  echo "========================================"
  echo "  AISQA 测试套件"
  echo "  位置: ${BACKEND_DIR}/tests/"
  echo "========================================"
  echo ""

  check_env
  run_tests "$@"
}

main "$@"
