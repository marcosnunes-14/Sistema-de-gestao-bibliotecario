from pathlib import Path

from sqlalchemy import create_engine, inspect, select, text
from sqlalchemy import event
from sqlalchemy.orm import sessionmaker

from app.core.config import DATABASE_URL
from app.models.base import Base
from app.models import (
    Aluno, Autor, Categoria, Editora, Emprestimo, Exemplar, Livro, PerfilUsuario, Prateleira,
    Renovacao, Secao, Usuario, Auditoria,
)  # noqa: F401

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


if DATABASE_URL.startswith("sqlite"):
    @event.listens_for(engine, "connect")
    def enable_sqlite_foreign_keys(dbapi_connection, _connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_database() -> None:
    if DATABASE_URL.startswith("sqlite"):
        Path(DATABASE_URL.removeprefix("sqlite:///")).parent.mkdir(
            parents=True,
            exist_ok=True,
        )
    Base.metadata.create_all(bind=engine)
    _upgrade_existing_schema()
    _ensure_default_shelves()


def _upgrade_existing_schema() -> None:
    if not DATABASE_URL.startswith("sqlite"):
        return
    inspector = inspect(engine)
    columns = {column["name"] for column in inspector.get_columns("categorias")}
    exemplar_columns = {column["name"] for column in inspector.get_columns("exemplares")}
    loan_columns = {column["name"] for column in inspector.get_columns("emprestimos")}
    with engine.begin() as connection:
        if "descricao" not in columns:
            connection.execute(text("ALTER TABLE categorias ADD COLUMN descricao TEXT"))
        if "ativo" not in columns:
            connection.execute(
                text("ALTER TABLE categorias ADD COLUMN ativo BOOLEAN NOT NULL DEFAULT 1")
            )
        if "cadastrado_por_id" not in exemplar_columns:
            connection.execute(text("ALTER TABLE exemplares ADD COLUMN cadastrado_por_id INTEGER"))
        if "realizado_por_id" not in loan_columns:
            connection.execute(text("ALTER TABLE emprestimos ADD COLUMN realizado_por_id INTEGER"))
        if "devolvido_por_id" not in loan_columns:
            connection.execute(text("ALTER TABLE emprestimos ADD COLUMN devolvido_por_id INTEGER"))


def _ensure_default_shelves() -> None:
    with SessionLocal.begin() as db:
        for number in range(1, 13):
            shelf = db.scalar(select(Prateleira).where(Prateleira.numero == number))
            if shelf is None:
                shelf = Prateleira(numero=number, descricao=f"Prateleira {number:02d}")
                db.add(shelf)
                db.flush()
            existing_sections = {section.numero for section in shelf.secoes}
            for section_number in range(1, 5):
                if section_number not in existing_sections:
                    db.add(Secao(
                        prateleira_id=shelf.id,
                        numero=section_number,
                        codigo_localizacao=f"P{number:02d}-S{section_number:02d}",
                    ))
