import sqlite3

from sqlalchemy import create_engine, select, text
from sqlalchemy.orm import sessionmaker

from app.db import session
from app.models import Livro, Prateleira


def test_startup_upgrades_old_catalog_before_loading_shelves_and_preserves_data(tmp_path, monkeypatch):
    path = tmp_path / 'biblioteca.db'
    engine = create_engine(f'sqlite:///{path}')
    with engine.begin() as connection:
        connection.execute(text('''CREATE TABLE prateleiras (
            id INTEGER PRIMARY KEY, numero INTEGER NOT NULL UNIQUE, descricao VARCHAR(200),
            ativa BOOLEAN NOT NULL, observacoes TEXT,
            data_criacao DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
            data_atualizacao DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL
        )'''))
        connection.execute(text("INSERT INTO prateleiras (id, numero, descricao, ativa) VALUES (1, 1, 'Acervo original', 1)"))
    monkeypatch.setattr(session, 'engine', engine)
    monkeypatch.setattr(session, 'DATABASE_URL', str(engine.url))
    monkeypatch.setattr(session, 'SessionLocal', sessionmaker(bind=engine))
    # This previously raised OperationalError: no such column prateleiras.finalidade.
    session.create_database()
    with session.SessionLocal.begin() as db:
        db.add(Livro(titulo='Livro preservado'))
    with engine.begin() as connection:
        connection.execute(text('ALTER TABLE livros DROP COLUMN tipo_obra'))
        connection.execute(text('ALTER TABLE exemplares DROP COLUMN situacao_alterada_em'))
    session.create_database()
    session.create_database()  # Repeated startup is safe.
    with session.SessionLocal() as db:
        assert len(db.scalars(select(Prateleira)).all()) == 12
        assert db.get(Prateleira, 1).descricao == 'Acervo original'
        assert db.scalar(select(Livro)).titulo == 'Livro preservado'
    backups = list((tmp_path / 'backups').glob('*.db'))
    assert len(backups) == 2
    with sqlite3.connect(backups[-1]) as backup:
        assert backup.execute('PRAGMA integrity_check').fetchone()[0] == 'ok'
    engine.dispose()
