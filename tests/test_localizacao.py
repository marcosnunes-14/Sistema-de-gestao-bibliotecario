def criar_prateleira(client, numero=3):
    response = client.post("/api/estoque/prateleiras", json={"numero": numero})
    assert response.status_code == 201
    return response.json()


def test_cadastrar_prateleira_e_secao_com_codigo(client):
    categoria = client.post(
        "/api/estoque/categorias",
        json={"nome": "Literatura Brasileira"},
    ).json()
    prateleira = criar_prateleira(client)

    response = client.post(
        f"/api/estoque/prateleiras/{prateleira['id']}/secoes",
        json={"numero": 2, "categoria_id": categoria["id"]},
    )

    assert response.status_code == 201
    assert response.json()["codigo_localizacao"] == "P03-S02"
    assert response.json()["categoria_id"] == categoria["id"]


def test_listar_secoes_por_prateleira(client):
    prateleira = criar_prateleira(client, numero=1)
    client.post(f"/api/estoque/prateleiras/{prateleira['id']}/secoes", json={"numero": 1})
    client.post(f"/api/estoque/prateleiras/{prateleira['id']}/secoes", json={"numero": 2})

    response = client.get("/api/estoque/secoes", params={"prateleira_id": prateleira["id"]})

    assert response.status_code == 200
    assert [item["codigo_localizacao"] for item in response.json()] == ["P01-S01", "P01-S02"]


def test_impedir_prateleira_duplicada(client):
    criar_prateleira(client, numero=4)

    response = client.post("/api/estoque/prateleiras", json={"numero": 4})

    assert response.status_code == 409


def test_impedir_secao_duplicada_na_prateleira(client):
    prateleira = criar_prateleira(client, numero=5)
    client.post(f"/api/estoque/prateleiras/{prateleira['id']}/secoes", json={"numero": 1})

    response = client.post(
        f"/api/estoque/prateleiras/{prateleira['id']}/secoes",
        json={"numero": 1},
    )

    assert response.status_code == 409


def test_secao_exige_prateleira_existente(client):
    response = client.post(
        "/api/estoque/prateleiras/999/secoes",
        json={"numero": 1},
    )

    assert response.status_code == 404


def test_editar_secao_recalcula_codigo_e_desativar(client):
    prateleira = criar_prateleira(client, numero=6)
    secao = client.post(
        f"/api/estoque/prateleiras/{prateleira['id']}/secoes",
        json={"numero": 1},
    ).json()

    editada = client.put(
        f"/api/estoque/secoes/{secao['id']}",
        json={"numero": 2},
    )
    desativada = client.patch(
        f"/api/estoque/secoes/{secao['id']}/status",
        json={"ativa": False},
    )

    assert editada.status_code == 200
    assert editada.json()["codigo_localizacao"] == "P06-S02"
    assert desativada.status_code == 200
    assert desativada.json()["ativa"] is False


def test_categoria_inexistente_e_rejeitada(client):
    prateleira = criar_prateleira(client, numero=7)

    response = client.post(
        f"/api/estoque/prateleiras/{prateleira['id']}/secoes",
        json={"numero": 1, "categoria_id": 999},
    )

    assert response.status_code == 404
