from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.api.dependencies import Page, PageSize
from app.core.security import get_current_user
from app.models.usuario import Usuario
from app.schemas.emprestimo import ExemplarCreate, ExemplarLocalizacaoUpdate, ExemplarRead, ExemplarSituacaoUpdate
from app.schemas.estoque import EstoqueAgregadoRead
from app.models.exemplar import SituacaoExemplar
from app.schemas.localizacao import (
	CategoriaCreate,
	CategoriaRead,
	CategoriaStatusUpdate,
	CategoriaUpdate,
	PrateleiraCreate,
	PrateleiraRead,
	PrateleiraStatusUpdate,
	PrateleiraUpdate,
	SecaoCreate,
	SecaoRead,
	SecaoStatusUpdate,
	SecaoUpdate,
)
from app.services.localizacao import (
	create_categoria,
	create_prateleira,
	create_secao,
	get_prateleira_or_404,
	get_categoria_or_404,
	get_secao_or_404,
	list_categorias,
	list_prateleiras,
	list_secoes,
	update_prateleira,
	update_categoria,
	update_categoria_status,
	update_prateleira_status,
	update_secao,
	update_secao_status,
)
from app.services.emprestimos import create_exemplar, get_exemplar_or_404, list_exemplares, update_exemplar_localizacao, update_exemplar_situacao
from app.services.estoque import list_estoque_agregado

router = APIRouter()
DbSession = Annotated[Session, Depends(get_db)]


@router.post("/exemplares", response_model=ExemplarRead, status_code=status.HTTP_201_CREATED)
def cadastrar_exemplar(
	data: ExemplarCreate,
	db: DbSession,
	usuario: Usuario = Depends(get_current_user),
) -> ExemplarRead:
	return create_exemplar(db, data, usuario)


@router.get("/exemplares", response_model=list[ExemplarRead])
def listar_exemplares(
	db: DbSession,
	livro_id: int | None = Query(default=None, gt=0),
	page: Page = 1,
	page_size: PageSize = 50,
) -> list[ExemplarRead]:
	return list_exemplares(db, livro_id=livro_id, page=page, page_size=page_size)


@router.get("/resumo", response_model=list[EstoqueAgregadoRead])
def resumo_estoque(
	db: DbSession,
	page: Page = 1,
	page_size: PageSize = 50,
	search: str | None = Query(default=None, min_length=1),
	categoria_id: int | None = Query(default=None, gt=0),
	situacao: SituacaoExemplar | None = None,
	prateleira_id: int | None = Query(default=None, gt=0),
	secao_id: int | None = Query(default=None, gt=0),
	finalidade: str | None = Query(default=None, min_length=1),
	genero: str | None = Query(default=None, min_length=1),
) -> list[EstoqueAgregadoRead]:
	return list_estoque_agregado(db, page, page_size, search, categoria_id, situacao.value if situacao else None, prateleira_id, secao_id, finalidade, genero)


@router.patch("/exemplares/{exemplar_id}/situacao", response_model=ExemplarRead)
def alterar_situacao_exemplar(
	exemplar_id: int,
	data: ExemplarSituacaoUpdate,
	db: DbSession,
	usuario: Usuario = Depends(get_current_user),
) -> ExemplarRead:
	return update_exemplar_situacao(db, get_exemplar_or_404(db, exemplar_id), data.situacao, usuario)


@router.patch("/exemplares/{exemplar_id}/localizacao", response_model=ExemplarRead)
def alterar_localizacao_exemplar(
	exemplar_id: int,
	data: ExemplarLocalizacaoUpdate,
	db: DbSession,
) -> ExemplarRead:
	return update_exemplar_localizacao(db, get_exemplar_or_404(db, exemplar_id), data.prateleira_id, data.secao_id)


@router.get("/exemplares/{exemplar_id}", response_model=ExemplarRead)
def consultar_exemplar(exemplar_id: int, db: DbSession) -> ExemplarRead:
	return get_exemplar_or_404(db, exemplar_id)


@router.post("/categorias", response_model=CategoriaRead, status_code=status.HTTP_201_CREATED)
def cadastrar_categoria(data: CategoriaCreate, db: DbSession) -> CategoriaRead:
	return create_categoria(db, data)


@router.get("/categorias", response_model=list[CategoriaRead])
def listar_categorias(db: DbSession) -> list[CategoriaRead]:
	return list_categorias(db)


@router.put("/categorias/{categoria_id}", response_model=CategoriaRead)
def editar_categoria(
	categoria_id: int,
	data: CategoriaUpdate,
	db: DbSession,
) -> CategoriaRead:
	categoria = get_categoria_or_404(db, categoria_id)
	return update_categoria(db, categoria, data)


@router.patch("/categorias/{categoria_id}/status", response_model=CategoriaRead)
def alterar_status_categoria(
	categoria_id: int,
	data: CategoriaStatusUpdate,
	db: DbSession,
) -> CategoriaRead:
	categoria = get_categoria_or_404(db, categoria_id)
	return update_categoria_status(db, categoria, data.ativo)


@router.post("/prateleiras", response_model=PrateleiraRead, status_code=status.HTTP_201_CREATED)
def cadastrar_prateleira(data: PrateleiraCreate, db: DbSession) -> PrateleiraRead:
	return create_prateleira(db, data)


@router.get("/prateleiras", response_model=list[PrateleiraRead])
def listar_prateleiras(db: DbSession) -> list[PrateleiraRead]:
	return list_prateleiras(db)


@router.get("/prateleiras/{prateleira_id}", response_model=PrateleiraRead)
def consultar_prateleira(prateleira_id: int, db: DbSession) -> PrateleiraRead:
	return get_prateleira_or_404(db, prateleira_id)


@router.put("/prateleiras/{prateleira_id}", response_model=PrateleiraRead)
def editar_prateleira(
	prateleira_id: int,
	data: PrateleiraUpdate,
	db: DbSession,
) -> PrateleiraRead:
	prateleira = get_prateleira_or_404(db, prateleira_id)
	return update_prateleira(db, prateleira, data)


@router.patch("/prateleiras/{prateleira_id}/status", response_model=PrateleiraRead)
def alterar_status_prateleira(
	prateleira_id: int,
	data: PrateleiraStatusUpdate,
	db: DbSession,
) -> PrateleiraRead:
	prateleira = get_prateleira_or_404(db, prateleira_id)
	return update_prateleira_status(db, prateleira, data.ativa)


@router.post(
	"/prateleiras/{prateleira_id}/secoes",
	response_model=SecaoRead,
	status_code=status.HTTP_201_CREATED,
)
def cadastrar_secao(
	prateleira_id: int,
	data: SecaoCreate,
	db: DbSession,
) -> SecaoRead:
	prateleira = get_prateleira_or_404(db, prateleira_id)
	return create_secao(db, prateleira, data)


@router.get("/secoes", response_model=list[SecaoRead])
def listar_secoes(
	db: DbSession,
	prateleira_id: int | None = Query(default=None, gt=0),
) -> list[SecaoRead]:
	return list_secoes(db, prateleira_id=prateleira_id)


@router.get("/secoes/{secao_id}", response_model=SecaoRead)
def consultar_secao(secao_id: int, db: DbSession) -> SecaoRead:
	return get_secao_or_404(db, secao_id)


@router.put("/secoes/{secao_id}", response_model=SecaoRead)
def editar_secao(secao_id: int, data: SecaoUpdate, db: DbSession) -> SecaoRead:
	secao = get_secao_or_404(db, secao_id)
	return update_secao(db, secao, data)


@router.patch("/secoes/{secao_id}/status", response_model=SecaoRead)
def alterar_status_secao(
	secao_id: int,
	data: SecaoStatusUpdate,
	db: DbSession,
) -> SecaoRead:
	secao = get_secao_or_404(db, secao_id)
	return update_secao_status(db, secao, data.ativa)
