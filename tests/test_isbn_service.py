from app.schemas.livro import LivroISBNRead
from app.services import isbn as isbn_service


def test_busca_combina_dados_dos_provedores(monkeypatch):
    monkeypatch.setattr(
        isbn_service,
        "_google",
        lambda value: LivroISBNRead(isbn=value, titulo="Dom Casmurro", idioma="pt"),
    )
    monkeypatch.setattr(
        isbn_service,
        "_open_library",
        lambda value: LivroISBNRead(
            isbn=value,
            titulo="Dom Casmurro",
            autores=["Machado de Assis"],
            editora="Editora Escolar",
            categorias=["Literatura brasileira"],
        ),
    )

    result = isbn_service.buscar_livro_isbn("978-85-359-0277-8")

    assert result.isbn == "9788535902778"
    assert result.titulo == "Dom Casmurro"
    assert result.autores == ["Machado de Assis"]
    assert result.editora == "Editora Escolar"
    assert result.categorias == ["Literatura brasileira"]


def test_busca_tenta_isbn_10_equivalente(monkeypatch):
    consulted = []

    def google(value):
        consulted.append(value)
        if value == "8535902775":
            return LivroISBNRead(isbn=value, titulo="Dom Casmurro")
        return None

    monkeypatch.setattr(isbn_service, "_google", google)
    monkeypatch.setattr(isbn_service, "_open_library", lambda value: None)

    result = isbn_service.buscar_livro_isbn("9788535902778")

    assert consulted == ["9788535902778", "8535902775"]
    assert result.isbn == "9788535902778"
    assert result.titulo == "Dom Casmurro"
