import os

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.db.session import get_db
from app.core.security import hash_password
from app.main import app
from app.models.base import Base
from app.models.aluno import Aluno  # noqa: F401
from app.models.usuario import PerfilUsuario, Usuario

os.environ["SECRET_KEY"] = "test-secret-key-for-automated-tests-32-bytes"


@pytest.fixture
def client() -> TestClient:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    connection = engine.connect()
    session = Session(bind=connection)
    session.add(
        Usuario(
            nome="Administrador de Teste",
            username="admin-teste",
            senha_hash=hash_password("SenhaTeste1"),
            perfil=PerfilUsuario.ADMINISTRADOR,
        )
    )
    session.commit()

    def override_get_db():
        yield session

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        login = test_client.post(
            "/api/auth/login",
            json={"username": "admin-teste", "senha": "SenhaTeste1"},
        )
        assert login.status_code == 200
        test_client.headers["Authorization"] = f"Bearer {login.json()['access_token']}"
        yield test_client
    session.close()
    connection.close()
    engine.dispose()
    app.dependency_overrides.clear()


@pytest.fixture
def aluno_payload() -> dict[str, str]:
    return {
        "nome_completo": "João Guilherme Silva",
        "matricula": "MAT-001",
        "turma": "A",
        "serie_ano": "6º ano",
        "turno": "Manhã",
        "telefone": "11999999999",
        "nome_responsavel": "Maria Silva",
        "telefone_responsavel": "11888888888",
    }
