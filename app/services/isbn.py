import json
import re
from urllib.error import HTTPError, URLError
from urllib.parse import quote
from urllib.request import Request, urlopen

from fastapi import HTTPException, status

from app.schemas.livro import LivroISBNRead, normalize_isbn


def _isbn_candidates(isbn: str) -> list[str]:
    """Return equivalent ISBNs, keeping the scanned value first."""
    candidates = [isbn]
    if len(isbn) == 10:
        base = f"978{isbn[:9]}"
        check_digit = (10 - sum(int(digit) * (1 if index % 2 == 0 else 3) for index, digit in enumerate(base)) % 10) % 10
        candidates.append(f"{base}{check_digit}")
    elif isbn.startswith("978"):
        base = isbn[3:12]
        check_value = (11 - sum(int(digit) * (10 - index) for index, digit in enumerate(base)) % 11) % 11
        candidates.append(f"{base}{'X' if check_value == 10 else check_value}")
    return candidates


def _merge_results(isbn: str, results: list[LivroISBNRead]) -> LivroISBNRead:
    """Combine providers instead of discarding useful fields from later ones."""
    merged = LivroISBNRead(isbn=isbn)
    scalar_fields = (
        "titulo", "subtitulo", "editora", "data_publicacao", "ano_publicacao",
        "descricao", "numero_paginas", "idioma", "capa_url",
    )
    for result in results:
        for field in scalar_fields:
            if not getattr(merged, field) and getattr(result, field):
                setattr(merged, field, getattr(result, field))
        for field in ("autores", "categorias"):
            current = getattr(merged, field)
            for item in getattr(result, field):
                if item and item not in current:
                    current.append(item)
    return merged


def _get_json(url: str) -> dict:
    request = Request(url, headers={"User-Agent": "SistemaBiblioteca/1.0"})
    with urlopen(request, timeout=6) as response:
        return json.load(response)


def _year(value: str | None) -> int | None:
    if not value:
        return None
    match = re.search(r"(?:19|20)\d{2}", value)
    if not match:
        return None
    year = int(match.group())
    return year if 1000 <= year <= 2100 else None


def _google(isbn: str) -> LivroISBNRead | None:
    data = _get_json(f"https://www.googleapis.com/books/v1/volumes?q=isbn:{quote(isbn)}&maxResults=1")
    items = data.get("items") or []
    if not items:
        return None
    info = items[0].get("volumeInfo") or {}
    title = info.get("title")
    if not title:
        return None
    published = info.get("publishedDate")
    images = info.get("imageLinks") or {}
    return LivroISBNRead(
        isbn=isbn,
        titulo=title,
        subtitulo=info.get("subtitle"),
        autores=info.get("authors") or [],
        editora=info.get("publisher"),
        data_publicacao=published,
        ano_publicacao=_year(published),
        descricao=info.get("description"),
        numero_paginas=info.get("pageCount"),
        idioma=info.get("language"),
        categorias=info.get("categories") or [],
        capa_url=images.get("thumbnail") or images.get("smallThumbnail"),
    )


def _open_library(isbn: str) -> LivroISBNRead | None:
    data = _get_json(f"https://openlibrary.org/api/books?bibkeys=ISBN:{quote(isbn)}&format=json&jscmd=data")
    info = data.get(f"ISBN:{isbn}") or {}
    title = info.get("title")
    if not title:
        return None
    authors = [author.get("name") for author in info.get("authors") or [] if author.get("name")]
    publishers = info.get("publishers") or []
    publish_date = info.get("publish_date")
    pages = info.get("number_of_pages")
    return LivroISBNRead(
        isbn=isbn,
        titulo=title,
        autores=authors,
        editora=publishers[0].get("name") if publishers else None,
        data_publicacao=publish_date,
        ano_publicacao=_year(publish_date),
        numero_paginas=pages if isinstance(pages, int) else None,
        categorias=[subject.get("name") for subject in info.get("subjects") or [] if subject.get("name")][:10],
        capa_url=(info.get("cover") or {}).get("medium") or (info.get("cover") or {}).get("large"),
    )


def buscar_livro_isbn(value: str) -> LivroISBNRead:
    try:
        isbn = normalize_isbn(value)
    except ValueError as error:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(error)) from error
    if isbn is None:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Informe um ISBN válido.")
    results: list[LivroISBNRead] = []
    candidates = _isbn_candidates(isbn)
    for provider in (_google, _open_library):
        for candidate in candidates:
            try:
                result = provider(candidate)
                if result:
                    results.append(result)
                    break
            except (HTTPError, URLError, TimeoutError, json.JSONDecodeError, ValueError, OSError):
                continue
    return _merge_results(isbn, results)
