from datetime import datetime, timedelta


def test_fluxo_completo_da_biblioteca(client):
    aluno = client.post(
        "/api/alunos",
        json={
            "nome_completo": "Maria de Integração",
            "matricula": "INT-001",
            "turma": "A",
            "serie_ano": "8º ano",
            "turno": "Manhã",
        },
    ).json()
    autor = client.post("/api/livros/autores", json={"nome": "Autor de Integração"}).json()
    categoria = client.post("/api/livros/categorias", json={"nome": "Categoria de Integração"}).json()
    editora = client.post("/api/livros/editoras", json={"nome": "Editora de Integração"}).json()
    livro = client.post(
        "/api/livros",
        json={
            "titulo": "Livro de Integração",
            "autor_ids": [autor["id"]],
            "categoria_id": categoria["id"],
            "editora_id": editora["id"],
        },
    ).json()
    exemplar = client.post(
        "/api/estoque/exemplares",
        json={"codigo": "INT-EX-001", "livro_id": livro["id"]},
    ).json()

    emprestimo = client.post(
        "/api/emprestimos",
        json={
            "aluno_id": aluno["id"],
            "exemplar_id": exemplar["id"],
            "data_prevista_devolucao": (datetime.now() + timedelta(days=7)).isoformat(),
        },
    )
    emprestimo_body = emprestimo.json()
    consultado = client.get(f"/api/emprestimos/{emprestimo_body['id']}")
    exemplar_emprestado = client.get(f"/api/estoque/exemplares/{exemplar['id']}")
    devolucao = client.post(f"/api/emprestimos/{emprestimo_body['id']}/devolucao", json={})
    exemplar_disponivel = client.get(f"/api/estoque/exemplares/{exemplar['id']}")
    historico = client.get(f"/api/emprestimos/historico/aluno/{aluno['id']}")

    assert emprestimo.status_code == 201
    assert consultado.status_code == 200
    assert exemplar_emprestado.json()["situacao"] == "emprestado"
    assert devolucao.status_code == 200
    assert exemplar_disponivel.json()["situacao"] == "disponivel"
    assert historico.status_code == 200
    assert historico.json()[0]["id"] == emprestimo_body["id"]
