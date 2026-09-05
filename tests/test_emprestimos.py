from datetime import datetime, timedelta


def setup_entities(client, exemplar_situacao="disponivel"):
    aluno = client.post(
        "/api/alunos",
        json={
            "nome_completo": "Maria Silva",
            "matricula": "MAT-LOAN-001",
            "turma": "A",
            "serie_ano": "7º ano",
            "turno": "Manhã",
        },
    ).json()
    autor = client.post("/api/livros/autores", json={"nome": "Autor do Empréstimo"}).json()
    categoria = client.post("/api/livros/categorias", json={"nome": "Categoria do Empréstimo"}).json()
    livro = client.post(
        "/api/livros",
        json={"titulo": "O Pequeno Príncipe", "autor_ids": [autor["id"]], "categoria_id": categoria["id"]},
    ).json()
    exemplar = client.post(
        "/api/estoque/exemplares",
        json={"codigo": "EX-000001", "livro_id": livro["id"], "situacao": exemplar_situacao},
    ).json()
    return aluno, livro, exemplar


def loan_payload(aluno, exemplar, **overrides):
    payload = {
        "aluno_id": aluno["id"],
        "exemplar_id": exemplar["id"],
        "data_prevista_devolucao": (datetime.now() + timedelta(days=7)).isoformat(),
    }
    payload.update(overrides)
    return payload


def test_emprestimo_normal_muda_exemplar(client):
    aluno, _, exemplar = setup_entities(client)

    response = client.post("/api/emprestimos", json=loan_payload(aluno, exemplar))

    assert response.status_code == 201
    assert response.json()["situacao"] == "ativo"
    assert response.json()["realizado_por_id"] is not None
    assert client.get(f"/api/estoque/exemplares/{exemplar['id']}").json()["situacao"] == "emprestado"


def test_nao_permitir_dois_emprestimos_para_mesmo_exemplar(client):
    aluno, _, exemplar = setup_entities(client)
    client.post("/api/emprestimos", json=loan_payload(aluno, exemplar))
    outro_aluno = client.post(
        "/api/alunos",
        json={
            "nome_completo": "João Silva",
            "matricula": "MAT-LOAN-002",
            "turma": "B",
            "serie_ano": "7º ano",
            "turno": "Tarde",
        },
    ).json()

    response = client.post("/api/emprestimos", json=loan_payload(outro_aluno, exemplar))

    assert response.status_code == 409


def test_aluno_inativo_nao_pode_emprestar(client):
    aluno, _, exemplar = setup_entities(client)
    client.patch(f"/api/alunos/{aluno['id']}/status", json={"ativo": False})

    response = client.post("/api/emprestimos", json=loan_payload(aluno, exemplar))

    assert response.status_code == 409
    assert client.get(f"/api/estoque/exemplares/{exemplar['id']}").json()["situacao"] == "disponivel"


def test_exemplar_indisponivel_nao_pode_emprestar(client):
    aluno, _, exemplar = setup_entities(client, exemplar_situacao="perdido")

    response = client.post("/api/emprestimos", json=loan_payload(aluno, exemplar))

    assert response.status_code == 409


def test_manutenção_e_baixa_preservam_exemplar_e_bloqueiam_emprestimo(client):
    aluno, livro, exemplar = setup_entities(client)

    manutencao = client.patch(f"/api/estoque/exemplares/{exemplar['id']}/situacao", json={"situacao": "manutencao"})
    bloqueado = client.post("/api/emprestimos", json=loan_payload(aluno, exemplar))
    baixa = client.patch(f"/api/estoque/exemplares/{exemplar['id']}/situacao", json={"situacao": "baixado"})
    historico = client.get(f"/api/emprestimos/historico/exemplar/{exemplar['id']}")

    assert manutencao.status_code == 200
    assert bloqueado.status_code == 409
    assert baixa.status_code == 200
    assert baixa.json()["situacao"] == "baixado"
    assert historico.status_code == 200


def test_resumo_de_estoque_agrega_sem_requisicoes_por_livro(client):
    _, livro, exemplar = setup_entities(client)

    resumo = client.get("/api/estoque/resumo?search=O%20Pequeno")

    assert resumo.status_code == 200
    assert resumo.json()[0]["livro_id"] == livro["id"]
    assert resumo.json()[0]["total"] == 1
    assert resumo.json()[0]["disponiveis"] == 1


def test_devolucao_normal_e_duas_devolucoes_sao_rejeitadas(client):
    aluno, _, exemplar = setup_entities(client)
    emprestimo = client.post("/api/emprestimos", json=loan_payload(aluno, exemplar)).json()

    devolucao = client.post(f"/api/emprestimos/{emprestimo['id']}/devolucao", json={})
    segunda = client.post(f"/api/emprestimos/{emprestimo['id']}/devolucao", json={})

    assert devolucao.status_code == 200
    assert devolucao.json()["situacao"] == "devolvido"
    assert devolucao.json()["devolvido_por_id"] is not None
    assert client.get(f"/api/estoque/exemplares/{exemplar['id']}").json()["situacao"] == "disponivel"
    assert segunda.status_code == 409


def test_devolucao_danificada_coloca_exemplar_em_manutencao(client):
    aluno, _, exemplar = setup_entities(client)
    emprestimo = client.post("/api/emprestimos", json=loan_payload(aluno, exemplar)).json()

    response = client.post(
        f"/api/emprestimos/{emprestimo['id']}/devolucao",
        json={"estado_conservacao": "danificado"},
    )

    assert response.status_code == 200
    assert client.get(f"/api/estoque/exemplares/{exemplar['id']}").json()["situacao"] == "manutencao"


def test_identificar_atraso_automaticamente(client):
    aluno, _, exemplar = setup_entities(client)
    ontem = datetime.now() - timedelta(days=1)
    emprestimo = client.post(
        "/api/emprestimos",
        json=loan_payload(aluno, exemplar, data_emprestimo=(ontem - timedelta(days=2)).isoformat(), data_prevista_devolucao=ontem.isoformat()),
    ).json()

    atrasados = client.get("/api/emprestimos/atrasados")
    consultado = client.get(f"/api/emprestimos/{emprestimo['id']}")

    assert atrasados.status_code == 200
    assert atrasados.json()[0]["situacao"] == "atrasado"
    assert consultado.json()["situacao"] == "atrasado"


def test_historicos_de_aluno_exemplar_e_livro(client):
    aluno, livro, exemplar = setup_entities(client)
    emprestimo = client.post("/api/emprestimos", json=loan_payload(aluno, exemplar)).json()

    assert client.get(f"/api/emprestimos/historico/aluno/{aluno['id']}").json()[0]["id"] == emprestimo["id"]
    assert client.get(f"/api/emprestimos/historico/exemplar/{exemplar['id']}").json()[0]["id"] == emprestimo["id"]
    assert client.get(f"/api/emprestimos/historico/livro/{livro['id']}").json()[0]["id"] == emprestimo["id"]


def test_renovacao_registra_novo_prazo(client):
    aluno, _, exemplar = setup_entities(client)
    emprestimo = client.post("/api/emprestimos", json=loan_payload(aluno, exemplar)).json()
    nova_data = (datetime.now() + timedelta(days=20)).isoformat()

    response = client.post(
        f"/api/emprestimos/{emprestimo['id']}/renovacao",
        json={"nova_data_prevista_devolucao": nova_data},
    )

    assert response.status_code == 200
    assert response.json()["data_prevista_devolucao"].startswith(nova_data[:16])


def test_cancelamento_libera_exemplar_sem_apagar_historico(client):
    aluno, _, exemplar = setup_entities(client)
    emprestimo = client.post("/api/emprestimos", json=loan_payload(aluno, exemplar)).json()

    response = client.post(f"/api/emprestimos/{emprestimo['id']}/cancelamento")

    assert response.status_code == 200
    assert response.json()["situacao"] == "cancelado"
    assert client.get(f"/api/estoque/exemplares/{exemplar['id']}").json()["situacao"] == "disponivel"
    assert client.get(f"/api/emprestimos/{emprestimo['id']}").status_code == 200


def test_validar_datas_do_emprestimo_e_devolucao(client):
    aluno, _, exemplar = setup_entities(client)
    agora = datetime.now()
    invalido = client.post(
        "/api/emprestimos",
        json=loan_payload(aluno, exemplar, data_emprestimo=agora.isoformat(), data_prevista_devolucao=agora.isoformat()),
    )
    emprestimo = client.post("/api/emprestimos", json=loan_payload(aluno, exemplar)).json()
    devolucao_invalida = client.post(
        f"/api/emprestimos/{emprestimo['id']}/devolucao",
        json={"data_devolucao": (agora - timedelta(days=1)).isoformat()},
    )

    assert invalido.status_code == 422
    assert devolucao_invalida.status_code == 422
    assert client.get(f"/api/estoque/exemplares/{exemplar['id']}").json()["situacao"] == "emprestado"
