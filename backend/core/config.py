"""全局配置：路径常量与 DeepSeek API 配置。"""
import os
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent.parent  # version2/

load_dotenv(BASE_DIR / ".env")

DATA_DIR = BASE_DIR / "data"
TRIALS_DIR = DATA_DIR / "trials"
PATIENTS_DIR = DATA_DIR / "patients"
UPLOADS_DIR = DATA_DIR / "uploads"
FRONTEND_DIST = BASE_DIR / "dist"

for _d in (TRIALS_DIR, PATIENTS_DIR, UPLOADS_DIR):
    _d.mkdir(parents=True, exist_ok=True)

DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY", "").strip()
DEEPSEEK_BASE_URL = os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com").strip()
DEEPSEEK_MODEL = os.getenv("DEEPSEEK_MODEL", "deepseek-chat").strip()


def api_key_ready() -> bool:
    return bool(DEEPSEEK_API_KEY)
