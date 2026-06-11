#!/bin/bash
# 智研入排 · 一键启动（macOS / Linux）
set -e
cd "$(dirname "$0")"

PYTHON=python3
command -v $PYTHON >/dev/null 2>&1 || { echo "❌ 未找到 Python3，请先安装：https://www.python.org/downloads/"; exit 1; }

# 1. 虚拟环境
if [ ! -d ".venv" ]; then
  echo "📦 首次运行：创建 Python 虚拟环境…"
  $PYTHON -m venv .venv
fi

# 2. 依赖（以 fastapi 是否可导入为安装标记）
if ! .venv/bin/python -c "import fastapi, fitz, openai, openpyxl" >/dev/null 2>&1; then
  echo "📦 安装依赖（首次约需几分钟）…"
  .venv/bin/pip install -q -r backend/requirements.txt \
    -i https://pypi.tuna.tsinghua.edu.cn/simple 2>/dev/null \
    || .venv/bin/pip install -q -r backend/requirements.txt
fi

# 3. .env
if [ ! -f ".env" ]; then
  cp .env.example .env
  echo ""
  echo "⚠️  已创建 .env 文件——请填入你的 DeepSeek API Key（DEEPSEEK_API_KEY=sk-xxxx）后重新运行 ./start.sh"
  echo "   （不填也可以启动，但只能浏览演示数据，无法使用 AI 解析与审核）"
  ${EDITOR:-open -t} .env 2>/dev/null || true
  exit 0
fi

# 4. 启动
echo "🚀 启动智研入排 → http://127.0.0.1:8780"
( sleep 2 && (open "http://127.0.0.1:8780" 2>/dev/null || xdg-open "http://127.0.0.1:8780" 2>/dev/null) ) &
cd backend && exec ../.venv/bin/python -m uvicorn main:app --host 127.0.0.1 --port 8780
