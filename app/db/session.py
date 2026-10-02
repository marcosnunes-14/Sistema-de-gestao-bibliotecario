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
    _upgrade_catalog_columns()
    _ensure_default_shelves()
    _upgrade_existing_schema()


def _upgrade_catalog_columns() -> None:
    """Add missing catalog/location columns before any ORM query on legacy SQLite."""
    if not DATABASE_URL.startswith("sqlite"):
        return
    expected = {
        "livros": ["numero_registro", "tipo_obra", "pi", "cdd", "cutter", "assunto", "local", "volumes", "serie", "observacoes"],
        "prateleiras": ["finalidade", "genero_principal"],
        "exemplares": ["prateleira_id", "secao_id", "situacao_alterada_em", "situacao_alterada_por_id"],
    }
    inspector = inspect(engine)
    missing = []
    for table_name, names in expected.items():
        existing = {column["name"] for column in inspector.get_columns(table_name)}
        for name in names:
            if name not in existing:
                column = Base.metadata.tables[table_name].c[name]
                missing.append((table_name, name, column.type.compile(dialect=engine.dialect)))
    if not missing:
        return
    # SQLite backup captures existing records before the additive upgrade.
    import sqlite3
    from datetime import datetime
    database = engine.url.database
    if database and database != ":memory:":
        source = Path(database)
        backup_dir = source.parent / "backups"
        backup_dir.mkdir(parents=True, exist_ok=True)
        destination = backup_dir / f"{source.stem}_antes_atualizacao_{datetime.now():%Y%m%d_%H%M%S_%f}.db"
        with sqlite3.connect(source) as original, sqlite3.connect(destination) as backup:
            original.backup(backup)
    with engine.begin() as connection:
        for table_name, name, column_type in missing:
            connection.execute(text(f'ALTER TABLE "{table_name}" ADD COLUMN "{name}" {column_type}'))


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
        if "nome_aluno" not in loan_columns:
            connection.execute(text("ALTER TABLE emprestimos ADD COLUMN nome_aluno VARCHAR(200)"))
        if "serie_aluno" not in loan_columns:
            connection.execute(text("ALTER TABLE emprestimos ADD COLUMN serie_aluno VARCHAR(50)"))
        if "codigo_livro" not in loan_columns:
            connection.execute(text("ALTER TABLE emprestimos ADD COLUMN codigo_livro VARCHAR(50)"))
        if "nome_livro" not in loan_columns:
            connection.execute(text("ALTER TABLE emprestimos ADD COLUMN nome_livro VARCHAR(300)"))
        if "autor_livro" not in loan_columns:
            connection.execute(text("ALTER TABLE emprestimos ADD COLUMN autor_livro VARCHAR(200)"))
        if "data_entrega" not in loan_columns:
            connection.execute(text("ALTER TABLE emprestimos ADD COLUMN data_entrega DATETIME"))
        if "aluno_id" in loan_columns:
            connection.execute(text("UPDATE emprestimos SET aluno_id = NULL WHERE aluno_id = 0"))
        if "exemplar_id" in loan_columns:
            connection.execute(text("UPDATE emprestimos SET exemplar_id = NULL WHERE exemplar_id = 0"))
        if "prateleira_id" in exemplar_columns:
            shelf_id = connection.execute(
                text("SELECT id FROM prateleiras WHERE numero = 1")
            ).scalar_one()
            connection.execute(
                text("UPDATE exemplares SET prateleira_id = :shelf_id, secao_id = NULL WHERE prateleira_id IS NULL"),
                {"shelf_id": shelf_id},
            )
        for row in connection.execute(text("PRAGMA index_list('livros')")).fetchall():
            index_name = row[1]
            unique = row[2]
            if unique != 1:
                continue
            index_columns = [
                row[2]
                for row in connection.execute(text(f"PRAGMA index_info('{index_name}')")).fetchall()
            ]
            if "isbn" in index_columns:
                connection.execute(text(f'DROP INDEX IF EXISTS "{index_name}"'))


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
