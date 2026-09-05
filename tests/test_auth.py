from datetime import datetime, timedelta, timezone

import jwt

from app.core.security import hash_password
from app.models.usuario import PerfilUsuario, Usuario


def criar_usuario(client, nome="Bibliotecário", username="bibliotecario", perfil="bibliotecario"):
    response = client.post(
        "/api/usuarios",
        json={"nome": nome, "username": username, "senha": "SenhaTeste2", "perfil": perfil},
    )
    assert response.status_code == 201
    return response.json()


def test_criar_usuario_nao_expoe_hash_e_admin_pode_gerenciar(client):
    usuario = criar_usuario(client)

    assert "senha_hash" not in usuario
    assert "senha" not in usuario
    assert client.get("/api/usuarios").status_code == 200


def test_login_correto_e_senha_incorreta(client):
    criar_usuario(client, username="login-teste")

    correto = client.post("/api/auth/login", json={"username": "login-teste", "senha": "SenhaTeste2"})
    incorreto = client.post("/api/auth/login", json={"username": "login-teste", "senha": "Errada123"})

    assert correto.status_code == 200
    assert correto.json()["token_type"] == "bearer"
    assert incorreto.status_code == 401


def test_usuario_inativo_nao_faz_login(client):
    usuario = criar_usuario(client, username="inativo-teste")
    client.patch(f"/api/usuarios/{usuario['id']}/status", json={"ativo": False})

    response = client.post("/api/auth/login", json={"username": "inativo-teste", "senha": "SenhaTeste2"})

    assert response.status_code == 401


def test_rota_protegida_sem_autenticacao(client):
    client.headers.pop("Authorization")

    response = client.get("/api/alunos")

    assert response.status_code == 401


def test_bibliotecario_acessa_rotinas_mas_nao_usuarios(client):
    usuario = criar_usuario(client, username="bibliotecario-teste")
    login = client.post(
        "/api/auth/login",
        json={"username": "bibliotecario-teste", "senha": "SenhaTeste2"},
    )
    client.headers["Authorization"] = f"Bearer {login.json()['access_token']}"

    alunos = client.get("/api/alunos")
    usuarios = client.get("/api/usuarios")

    assert alunos.status_code == 200
    assert usuarios.status_code == 403
    assert usuario["perfil"] == "bibliotecario"


def test_admin_pode_filtrar_usuarios_sem_carregar_toda_a_base(client):
    criar_usuario(client, nome="Ana Biblioteca", username="ana-biblioteca")
    criar_usuario(client, nome="Bruno Biblioteca", username="bruno-biblioteca")

    response = client.get("/api/usuarios?search=Ana&perfil=bibliotecario&ativo=true")

    assert response.status_code == 200
    assert [item["username"] for item in response.json()] == ["ana-biblioteca"]


def test_nao_permite_remover_o_ultimo_administrador_ativo(client):
    admin = client.get("/api/usuarios").json()[0]

    status_response = client.patch(f"/api/usuarios/{admin['id']}/status", json={"ativo": False})
    perfil_response = client.put(
        f"/api/usuarios/{admin['id']}",
        json={"perfil": "bibliotecario"},
    )

    assert status_response.status_code == 409
    assert perfil_response.status_code == 409


def test_alteracao_de_senha(client):
    usuario = criar_usuario(client, username="senha-teste")
    response = client.patch(
        f"/api/usuarios/{usuario['id']}/senha",
        json={"senha_atual": "SenhaTeste2", "nova_senha": "NovaSenha3"},
    )

    assert response.status_code == 200
    assert client.post("/api/auth/login", json={"username": "senha-teste", "senha": "NovaSenha3"}).status_code == 200
    assert client.post("/api/auth/login", json={"username": "senha-teste", "senha": "SenhaTeste2"}).status_code == 401


def test_admin_pode_redefinir_senha_de_outro_usuario_e_auditoria_nao_expoe_senha(client):
    usuario = criar_usuario(client, username="reset-teste")
    response = client.patch(f"/api/usuarios/{usuario['id']}/senha/admin", json={"nova_senha": "ResetSenha3"})
    auditoria = client.get("/api/auditoria?acao=redefinir_senha&entidade=usuario")

    assert response.status_code == 200
    assert client.post("/api/auth/login", json={"username": "reset-teste", "senha": "ResetSenha3"}).status_code == 200
    assert auditoria.status_code == 200
    assert "ResetSenha3" not in auditoria.text
    assert "senha_hash" not in response.text


def test_hash_de_senha_e_diferente_da_senha(client):
    user = Usuario(
        nome="Hash",
        username="hash-teste",
        senha_hash=hash_password("SenhaTeste4"),
        perfil=PerfilUsuario.BIBLIOTECARIO,
    )
    assert user.senha_hash != "SenhaTeste4"


def test_token_expirado_nao_acessa_rota(client, monkeypatch):
    monkeypatch.setenv("SECRET_KEY", "test-secret-key-for-automated-tests-32-bytes")
    token = jwt.encode(
        {"sub": "1", "type": "access", "exp": datetime.now(timezone.utc) - timedelta(minutes=1)},
        "test-secret-key-for-automated-tests-32-bytes",
        algorithm="HS256",
    )
    client.headers["Authorization"] = f"Bearer {token}"

    response = client.get("/api/alunos")

    assert response.status_code == 401
