@echo off
chcp 65001 >nul
rem 智研入排 · 一键启动（Windows）
cd /d "%~dp0"

where python >nul 2>nul
if errorlevel 1 (
  echo ❌ 未找到 Python，请到 python.org/downloads 安装，务必勾选 "Add Python to PATH"
  pause & exit /b 1
)

if not exist ".venv" (
  echo 📦 首次运行：创建 Python 虚拟环境…
  python -m venv .venv
)

.venv\Scripts\python -c "import fastapi, fitz, openai, openpyxl" >nul 2>nul
if errorlevel 1 (
  echo 📦 安装依赖（首次约需几分钟）…
  .venv\Scripts\pip install -q -r backend\requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple
  if errorlevel 1 .venv\Scripts\pip install -q -r backend\requirements.txt
)

if not exist ".env" (
  copy .env.example .env >nul
  echo.
  echo ⚠️  已创建 .env 文件——请在打开的记事本中填入 DeepSeek API Key 后保存，再次双击 start.bat
  notepad .env
  exit /b 0
)

echo 🚀 启动智研入排 → http://127.0.0.1:8780
start "" "http://127.0.0.1:8780"
cd backend
..\.venv\Scripts\python -m uvicorn main:app --host 127.0.0.1 --port 8780
pause
