import pytest
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker

from app import cli
from app.core.security import hash_password, verify_password
from app.models import Livro, Usuario, PerfilUsuario
from app.models.base import Base


@pytest.fixture
def database(tmp_path, monkeypatch):
    engine = create_engine(f"sqlite:///{tmp_path / 'biblioteca.db'}")
    Base.metadata.create_all(engine)
    sessions = sessionmaker(bind=engine)
    monkeypatch.setattr(cli, 'engine', engine)
    monkeypatch.setattr(cli, 'SessionLocal', sessions)
    with sessions.begin() as db:
        db.add(Usuario(nome='Bibliotecária', username='SGB', perfil=PerfilUsuario.BIBLIOTECARIO, senha_hash=hash_password('Anterior123')))
        db.add(Livro(titulo='Acervo preservado'))
    yield sessions
    engine.dispose()


def test_diagnose_lists_logins_and_counts_without_exposing_hashes(database, capsys):
    cli.diagnose()
    output = capsys.readouterr().out
    assert 'Login: SGB' in output
    assert 'livros: 1' in output
    assert 'usuarios: 1' in output
    assert 'Anterior123' not in output
    assert 'argon2' not in output


def test_reset_password_preserves_user_and_books(database, monkeypatch):
    answers = iter(['NovaSenha123', 'NovaSenha123'])
    monkeypatch.setattr(cli, 'getpass', lambda _: next(answers))
    cli.reset_password('SGB')
    with database() as db:
        user = db.scalar(select(Usuario))
        assert user.id == 1 and user.username == 'SGB'
        assert verify_password('NovaSenha123', user.senha_hash)
        assert db.scalar(select(Livro)).titulo == 'Acervo preservado'


def test_failed_confirmation_and_unknown_user_do_not_change_accounts(database, monkeypatch):
    answers = iter(['NovaSenha123', 'Diferente123'])
    monkeypatch.setattr(cli, 'getpass', lambda _: next(answers))
    with pytest.raises(SystemExit, match='não conferem'):
        cli.reset_password('SGB')
    with pytest.raises(SystemExit, match='não encontrado'):
        cli.reset_password('inexistente')
    with database() as db:
        assert verify_password('Anterior123', db.scalar(select(Usuario)).senha_hash)


def test_diagnose_does_not_create_missing_sqlite_file(tmp_path, monkeypatch):
    path = tmp_path / 'missing.db'
    engine = create_engine(f'sqlite:///{path}')
    monkeypatch.setattr(cli, 'engine', engine)
    with pytest.raises(SystemExit, match='nenhum banco foi criado'):
        cli.diagnose()
    assert not path.exists()
    engine.dispose()
