import os
from pathlib import Path

from dotenv import load_dotenv


load_dotenv()

BASE_DIR = Path(__file__).resolve().parents[2]
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "sqlite:///./biblioteca.db",
)
APP_ENV = os.getenv("APP_ENV", "development")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://127.0.0.1:5173")
CORS_ORIGINS = [origin.strip() for origin in os.getenv("CORS_ORIGINS", FRONTEND_URL).split(",") if origin.strip()]
