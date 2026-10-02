import os
from pathlib import Path

from dotenv import load_dotenv


BASE_DIR = Path(__file__).resolve().parents[2]
load_dotenv(BASE_DIR / ".env")
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "sqlite:///" + str(BASE_DIR / "biblioteca.db"),
)
# Resolve relative SQLite paths against the project, regardless of the terminal folder.
if DATABASE_URL.startswith("sqlite:///") and DATABASE_URL != "sqlite:///:memory:":
    database_path = Path(DATABASE_URL.removeprefix("sqlite:///"))
    if not database_path.is_absolute():
        DATABASE_URL = "sqlite:///" + str(BASE_DIR / database_path)
APP_ENV = os.getenv("APP_ENV", "development")
FRONTEND_URL = os.getenv("FRONTEND_URL", "https://localhost:5173")
DEFAULT_CORS_ORIGINS = list(dict.fromkeys([
    FRONTEND_URL,
    "https://localhost:5173", "https://127.0.0.1:5173",
    "http://localhost:5173", "http://127.0.0.1:5173",
]))
CORS_ORIGINS = [
    origin.strip()
    for origin in os.getenv("CORS_ORIGINS", ",".join(DEFAULT_CORS_ORIGINS)).split(",")
    if origin.strip()
]
