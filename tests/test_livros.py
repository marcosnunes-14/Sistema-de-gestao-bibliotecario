def criar_catalogo_base(client):
    autor = client.post("/api/livros/autores", json={"nome": "Machado de Assis"})
    categoria = client.post(
        "/api/livros/categorias",
        json={"nome": "Literatura Brasileira", "descricao": "Obras nacionais"},
    )
    editora = client.post("/api/livros/editoras", json={"nome": "Editora Escolar"})
    assert autor.status_code == categoria.status_code == editora.status_code == 201
    return autor.json(), categoria.json(), editora.json()


def livro_payload(autor, categoria, editora, **overrides):
    payload = {
        "titulo": "Dom Casmurro",
        "subtitulo": "Memórias de Bentinho",
        "autor_ids": [autor["id"]],
        "isbn": "9788535902778",
        "editora_id": editora["id"],
        "categoria_id": categoria["id"],
        "ano_publicacao": 1899,
        "numero_paginas": 256,
    }
    payload.update(overrides)
    return payload


def test_cadastrar_livro_com_relacionamentos(client):
    autor, categoria, editora = criar_catalogo_base(client)

    response = client.post("/api/livros", json=livro_payload(autor, categoria, editora))

    assert response.status_code == 201
    body = response.json()
    assert body["titulo"] == "Dom Casmurro"
    assert body["idioma"] == "Português"
    assert body["autores"][0]["nome"] == "Machado de Assis"
    assert body["categoria_id"] == categoria["id"]
    assert body["editora_id"] == editora["id"]


def test_cadastrar_e_listar_autor_categoria_editora(client):
    autor, categoria, editora = criar_catalogo_base(client)

    assert client.get("/api/livros/autores", params={"nome": "Machado"}).json()[0]["id"] == autor["id"]
    assert client.get("/api/livros/categorias").json()[0]["id"] == categoria["id"]
    assert client.get("/api/livros/editoras", params={"nome": "Escolar"}).json()[0]["id"] == editora["id"]


def test_consultar_e_pesquisar_livro_por_titulo_e_autor(client):
    autor, categoria, editora = criar_catalogo_base(client)
    livro = client.post("/api/livros", json=livro_payload(autor, categoria, editora)).json()

    consultado = client.get(f"/api/livros/{livro['id']}")
    por_titulo = client.get("/api/livros", params={"titulo": "dom"})
    por_autor = client.get("/api/livros", params={"autor": "Machado"})
    por_categoria = client.get("/api/livros", params={"categoria": "Literatura"})
    por_editora = client.get("/api/livros", params={"editora": "Escolar"})

    assert consultado.status_code == 200
    assert por_titulo.json()[0]["id"] == livro["id"]
    assert por_autor.json()[0]["id"] == livro["id"]
    assert por_categoria.json()[0]["id"] == livro["id"]
    assert por_editora.json()[0]["id"] == livro["id"]


def test_isbn_e_normalizado_e_nao_pode_repetir(client):
    autor, categoria, editora = criar_catalogo_base(client)
    primeiro = client.post(
        "/api/livros",
        json=livro_payload(autor, categoria, editora, isbn="978-85-359-0277-8"),
    )
    segundo = client.post(
        "/api/livros",
        json=livro_payload(autor, categoria, editora, titulo="Outro livro"),
    )

    assert primeiro.status_code == 201
    assert primeiro.json()["isbn"] == "9788535902778"
    assert segundo.status_code == 409


def test_validar_referencias_e_dados_invalidos(client):
    response = client.post(
        "/api/livros",
        json={"titulo": "Livro sem autor", "autor_ids": [999]},
    )
    autor_vazio = client.post("/api/livros/autores", json={"nome": "   "})
    categoria_vazia = client.post("/api/livros/categorias", json={"nome": " "})
    editora_vazia = client.post("/api/livros/editoras", json={"nome": " "})

    assert response.status_code == 404
    assert autor_vazio.status_code == categoria_vazia.status_code == editora_vazia.status_code == 422


def test_editar_e_desativar_livro(client):
    autor, categoria, editora = criar_catalogo_base(client)
    livro = client.post("/api/livros", json=livro_payload(autor, categoria, editora)).json()

    editado = client.put(f"/api/livros/{livro['id']}", json={"titulo": "Dom Casmurro Atualizado"})
    desativado = client.patch(f"/api/livros/{livro['id']}/status", json={"ativo": False})

    assert editado.status_code == 200
    assert editado.json()["titulo"] == "Dom Casmurro Atualizado"
    assert desativado.status_code == 200
    assert desativado.json()["ativo"] is False


def test_editar_e_desativar_autor_categoria_editora(client):
    autor, categoria, editora = criar_catalogo_base(client)

    autor_editado = client.put(f"/api/livros/autores/{autor['id']}", json={"nome": "Machado Atualizado"})
    categoria_editada = client.put(
        f"/api/livros/categorias/{categoria['id']}",
        json={"nome": "Literatura Nacional"},
    )
    editora_editada = client.put(f"/api/livros/editoras/{editora['id']}", json={"nome": "Editora Nova"})
    autor_inativo = client.patch(f"/api/livros/autores/{autor['id']}/status", json={"ativo": False})
    categoria_inativa = client.patch(f"/api/livros/categorias/{categoria['id']}/status", json={"ativo": False})
    editora_inativa = client.patch(f"/api/livros/editoras/{editora['id']}/status", json={"ativo": False})

    assert autor_editado.status_code == categoria_editada.status_code == editora_editada.status_code == 200
    assert autor_inativo.json()["ativo"] is False
    assert categoria_inativa.json()["ativo"] is False
    assert editora_inativa.json()["ativo"] is False
