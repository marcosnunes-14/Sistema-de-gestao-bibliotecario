from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.api.dependencies import Page, PageSize
from app.schemas.livro import (
	AutorCreate, AutorRead, AutorUpdate, EditoraCreate, EditoraRead, EditoraUpdate,
	LivroCreate, LivroISBNRead, LivroRead, LivroStatusUpdate, LivroUpdate,
)
from app.schemas.localizacao import CategoriaCreate, CategoriaRead, CategoriaStatusUpdate, CategoriaUpdate
from app.services.localizacao import (
	create_categoria, get_categoria_or_404, list_categorias, update_categoria, update_categoria_status,
)
from app.services.livros import (
	create_autor, create_editora, create_livro, get_autor_or_404, get_editora_or_404,
	get_livro_or_404, list_autores, list_editoras, list_livros, update_autor,
	update_editora, update_livro, update_status,
)
from app.services.isbn import buscar_livro_isbn

router = APIRouter()
DbSession = Annotated[Session, Depends(get_db)]


@router.post("/autores", response_model=AutorRead, status_code=status.HTTP_201_CREATED)
def cadastrar_autor(data: AutorCreate, db: DbSession) -> AutorRead:
	return create_autor(db, data)


@router.get("/autores", response_model=list[AutorRead])
def listar_autores(db: DbSession, nome: str | None = Query(default=None)) -> list[AutorRead]:
	return list_autores(db, nome=nome)


@router.put("/autores/{autor_id}", response_model=AutorRead)
def editar_autor(autor_id: int, data: AutorUpdate, db: DbSession) -> AutorRead:
	return update_autor(db, get_autor_or_404(db, autor_id), data)


@router.patch("/autores/{autor_id}/status", response_model=AutorRead)
def alterar_status_autor(autor_id: int, data: LivroStatusUpdate, db: DbSession) -> AutorRead:
	return update_status(get_autor_or_404(db, autor_id), data.ativo, db)


@router.post("/editoras", response_model=EditoraRead, status_code=status.HTTP_201_CREATED)
def cadastrar_editora(data: EditoraCreate, db: DbSession) -> EditoraRead:
	return create_editora(db, data)


@router.get("/editoras", response_model=list[EditoraRead])
def listar_editoras(db: DbSession, nome: str | None = Query(default=None)) -> list[EditoraRead]:
	return list_editoras(db, nome=nome)


@router.put("/editoras/{editora_id}", response_model=EditoraRead)
def editar_editora(editora_id: int, data: EditoraUpdate, db: DbSession) -> EditoraRead:
	return update_editora(db, get_editora_or_404(db, editora_id), data)


@router.patch("/editoras/{editora_id}/status", response_model=EditoraRead)
def alterar_status_editora(editora_id: int, data: LivroStatusUpdate, db: DbSession) -> EditoraRead:
	return update_status(get_editora_or_404(db, editora_id), data.ativo, db)


@router.post("/categorias", response_model=CategoriaRead, status_code=status.HTTP_201_CREATED)
def cadastrar_categoria(data: CategoriaCreate, db: DbSession) -> CategoriaRead:
	return create_categoria(db, data)


@router.get("/categorias", response_model=list[CategoriaRead])
def listar_categorias(db: DbSession) -> list[CategoriaRead]:
	return list_categorias(db)


@router.put("/categorias/{categoria_id}", response_model=CategoriaRead)
def editar_categoria(categoria_id: int, data: CategoriaUpdate, db: DbSession) -> CategoriaRead:
	return update_categoria(db, get_categoria_or_404(db, categoria_id), data)


@router.patch("/categorias/{categoria_id}/status", response_model=CategoriaRead)
def alterar_status_categoria(categoria_id: int, data: CategoriaStatusUpdate, db: DbSession) -> CategoriaRead:
	return update_categoria_status(db, get_categoria_or_404(db, categoria_id), data.ativo)


@router.post("", response_model=LivroRead, status_code=status.HTTP_201_CREATED)
def cadastrar_livro(data: LivroCreate, db: DbSession) -> LivroRead:
	return create_livro(db, data)


@router.get("/buscar-isbn/{isbn}", response_model=LivroISBNRead)
def buscar_por_isbn(isbn: str) -> LivroISBNRead:
	return buscar_livro_isbn(isbn)


@router.get("", response_model=list[LivroRead])
def listar_livros(
	db: DbSession,
	titulo: str | None = Query(default=None),
	autor: str | None = Query(default=None),
	isbn: str | None = Query(default=None),
	categoria_id: int | None = Query(default=None, gt=0),
	editora_id: int | None = Query(default=None, gt=0),
	categoria: str | None = Query(default=None),
	editora: str | None = Query(default=None),
	page: Page = 1,
	page_size: PageSize = 50,
) -> list[LivroRead]:
	return list_livros(db, titulo, autor, isbn, categoria_id, editora_id, categoria, editora, page, page_size)


@router.get("/{livro_id}", response_model=LivroRead)
def consultar_livro(livro_id: int, db: DbSession) -> LivroRead:
	return get_livro_or_404(db, livro_id)


@router.put("/{livro_id}", response_model=LivroRead)
def editar_livro(livro_id: int, data: LivroUpdate, db: DbSession) -> LivroRead:
	return update_livro(db, get_livro_or_404(db, livro_id), data)


@router.patch("/{livro_id}/status", response_model=LivroRead)
def alterar_status_livro(livro_id: int, data: LivroStatusUpdate, db: DbSession) -> LivroRead:
	return update_status(get_livro_or_404(db, livro_id), data.ativo, db)
