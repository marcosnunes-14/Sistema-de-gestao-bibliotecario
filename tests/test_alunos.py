def cadastrar(client, payload):
    response = client.post("/api/alunos", json=payload)
    assert response.status_code == 201
    return response.json()


def test_cadastrar_aluno(client, aluno_payload):
    aluno = cadastrar(client, aluno_payload)

    assert aluno["id"] > 0
    assert aluno["nome_completo"] == "João Guilherme Silva"
    assert aluno["ativo"] is True
    assert aluno["data_cadastro"]
    assert aluno["data_atualizacao"]


def test_consultar_aluno(client, aluno_payload):
    aluno = cadastrar(client, aluno_payload)

    response = client.get(f"/api/alunos/{aluno['id']}")

    assert response.status_code == 200
    assert response.json()["matricula"] == "MAT-001"


def test_listar_e_buscar_alunos(client, aluno_payload):
    cadastrar(client, aluno_payload)
    outro = {**aluno_payload, "nome_completo": "Ana Costa", "matricula": "MAT-002", "turma": "B"}
    cadastrar(client, outro)

    por_nome = client.get("/api/alunos", params={"nome": "João"})
    por_matricula = client.get("/api/alunos", params={"matricula": "MAT-002"})
    por_turma = client.get("/api/alunos", params={"turma": "B"})

    assert len(por_nome.json()) == 1
    assert por_matricula.json()[0]["nome_completo"] == "Ana Costa"
    assert por_turma.json()[0]["matricula"] == "MAT-002"


def test_editar_aluno(client, aluno_payload):
    aluno = cadastrar(client, aluno_payload)

    response = client.put(
        f"/api/alunos/{aluno['id']}",
        json={"nome_completo": "João Silva Atualizado", "turma": "C"},
    )

    assert response.status_code == 200
    assert response.json()["nome_completo"] == "João Silva Atualizado"
    assert response.json()["turma"] == "C"


def test_desativar_aluno(client, aluno_payload):
    aluno = cadastrar(client, aluno_payload)

    response = client.patch(f"/api/alunos/{aluno['id']}/status", json={"ativo": False})

    assert response.status_code == 200
    assert response.json()["ativo"] is False
    assert client.get(f"/api/alunos/{aluno['id']}").json()["ativo"] is False


def test_impedir_matricula_duplicada(client, aluno_payload):
    cadastrar(client, aluno_payload)

    response = client.post("/api/alunos", json=aluno_payload)

    assert response.status_code == 409
    assert response.json()["detail"] == "Já existe um aluno com esta matrícula."


def test_impedir_cadastro_invalido(client, aluno_payload):
    invalido = {**aluno_payload, "nome_completo": "   ", "matricula": ""}

    response = client.post("/api/alunos", json=invalido)

    assert response.status_code == 422
    assert "não pode ser vazio" in response.text
