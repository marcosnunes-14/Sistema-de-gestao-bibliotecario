from datetime import datetime
from pathlib import Path
import sqlite3
import sys
import os
import subprocess

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from app.core.config import DATABASE_URL

BACKUP_DIR = ROOT / "backups"


def source_path() -> Path:
    if not DATABASE_URL.startswith("sqlite:///"):
        raise SystemExit("O backup atual suporta apenas SQLite.")
    path = Path(DATABASE_URL.removeprefix("sqlite:///"))
    return path if path.is_absolute() else ROOT / path


def main() -> None:
    BACKUP_DIR.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now().strftime("%Y-%m-%d_%H%M%S")
    if DATABASE_URL.startswith("sqlite:///"):
        source = source_path()
        if not source.exists():
            raise SystemExit(f"Banco não encontrado: {source}")
        destination = BACKUP_DIR / f"biblioteca_{timestamp}.db"
        with sqlite3.connect(source) as source_connection, sqlite3.connect(destination) as backup_connection:
            source_connection.backup(backup_connection)
    elif DATABASE_URL.startswith("postgresql"):
        destination = BACKUP_DIR / f"biblioteca_{timestamp}.sql"
        result = subprocess.run(["pg_dump", DATABASE_URL, "--file", os.fspath(destination)], check=False)
        if result.returncode:
            raise SystemExit("pg_dump não está disponível ou o backup PostgreSQL falhou.")
    else:
        raise SystemExit("O backup atual suporta SQLite e PostgreSQL.")
    print(f"Backup criado: {destination}")


if __name__ == "__main__":
    main()
