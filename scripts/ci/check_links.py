#!/usr/bin/env python3
"""Markdown 相对链接/图片完整性检查（零依赖）
校验所有 *.md 中的相对链接与图片路径是否存在（跳过 http(s)/mailto/锚点/模板占位）。
用法：python3 scripts/ci/check_links.py [仓库根目录]
"""

import re
import sys
from pathlib import Path

ROOT = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else Path.cwd()
SKIP_DIRS = {
    ".git",
    "node_modules",
    "__pycache__",
    ".venv",
    "venv",
    "dist",
    "test-results",
    "playwright-report",
    ".playwright-mcp",
}
LINK_RE = re.compile(r'!?\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)')


def is_external(target: str) -> bool:
    return target.startswith(("http://", "https://", "mailto:", "#", "data:", "{", "<"))


bad, total = [], 0
for md in ROOT.rglob("*.md"):
    if any(part in SKIP_DIRS for part in md.parts):
        continue
    text = md.read_text(encoding="utf-8", errors="ignore")
    # 去除围栏代码块，避免示例路径误报
    text = re.sub(r"```.*?```", "", text, flags=re.S)
    for m in LINK_RE.finditer(text):
        target = m.group(1)
        if is_external(target):
            continue
        total += 1
        rel = target.split("#", 1)[0]
        if not rel:
            continue
        resolved = (md.parent / rel).resolve()
        if not resolved.exists():
            bad.append(f"{md.relative_to(ROOT)} -> {target}")

print(f"检查 {total} 个相对链接，失效 {len(bad)} 个")
for b in bad:
    print("  ✗", b)
sys.exit(1 if bad else 0)
