"""Start the local API and interface using the project directory on Windows/Linux."""
import os
from pathlib import Path
import secrets
import shutil
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
os.chdir(ROOT)


def main():
    try:
        from dotenv import dotenv_values, set_key
    except ImportError:
        raise SystemExit("Instale as dependências: python -m pip install -r requirements.txt")
    npm = shutil.which("npm.cmd" if os.name == "nt" else "npm")
    if not npm:
        raise SystemExit("Instale o Node.js (com npm) para iniciar a interface.")
    if not (ROOT / "frontend/node_modules").exists():
        raise SystemExit("Instale a interface: cd frontend e execute npm ci")
    env_file = ROOT / ".env"
    if not env_file.exists():
        env_file.write_text((ROOT / ".env.example").read_text(), encoding="utf-8")
        # Reuse the legacy database when this is the first local setup.
        if not (ROOT / "biblioteca.db").exists() and (ROOT / "data/biblioteca.db").exists():
            set_key(env_file, "DATABASE_URL", "sqlite:///./data/biblioteca.db")
    settings = dotenv_values(env_file)
    key = os.getenv("SECRET_KEY", settings.get("SECRET_KEY") or "")
    if not key or key == "gere-uma-chave-aleatoria-com-pelo-menos-32-caracteres":
        if "SECRET_KEY" in os.environ:
            raise SystemExit("Remova ou corrija a SECRET_KEY inválida definida no terminal.")
        set_key(env_file, "SECRET_KEY", secrets.token_urlsafe(48))
    elif len(key) < 32:
        raise SystemExit("A SECRET_KEY existente precisa ter pelo menos 32 caracteres.")

    from app.db.session import SessionLocal, create_database
    from app.models.usuario import Usuario
    from sqlalchemy import select
    create_database()
    with SessionLocal() as db:
        has_users = db.scalar(select(Usuario.id).limit(1)) is not None
    if not has_users:
        print("Este banco ainda não tem usuários. Crie o primeiro administrador.")
        from app.cli import create_admin
        create_admin()

    processes = []
    try:
        processes.append(subprocess.Popen([sys.executable, "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8000"], cwd=ROOT))
        processes.append(subprocess.Popen([npm, "run", "dev", "--", "--host", "127.0.0.1"], cwd=ROOT / "frontend"))
        print("Abra https://localhost:5173. Mantenha este terminal aberto. Ctrl+C encerra o sistema.", flush=True)
        exit_code = processes[1].wait()
        if exit_code:
            raise SystemExit(exit_code)
    except KeyboardInterrupt:
        pass
    finally:
        for process in reversed(processes):
            if process.poll() is None:
                process.terminate()
                try:
                    process.wait(timeout=5)
                except subprocess.TimeoutExpired:
                    process.kill()


if __name__ == "__main__":
    main()
