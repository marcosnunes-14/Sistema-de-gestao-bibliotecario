from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.api.dependencies import Page, PageSize
from app.core.security import get_current_user
from app.models.usuario import Usuario
from app.schemas.emprestimo import (
    DevolucaoCreate,
    EmprestimoCreate,
    EmprestimoRead,
    RenovacaoCreate,
    RenovacaoRead,
)
from app.services.emprestimos import (
    cancelar_emprestimo,
    create_emprestimo,
    devolver_emprestimo,
    get_emprestimo_or_404,
    historico_aluno,
    historico_exemplar,
    historico_livro,
    list_emprestimos,
    renovar_emprestimo,
)

router = APIRouter()
DbSession = Annotated[Session, Depends(get_db)]


@router.post("", response_model=EmprestimoRead, status_code=status.HTTP_201_CREATED)
def criar_emprestimo(
    data: EmprestimoCreate,
    db: DbSession,
    usuario: Usuario = Depends(get_current_user),
) -> EmprestimoRead:
    return create_emprestimo(db, data, usuario)


@router.get("", response_model=list[EmprestimoRead])
def listar_emprestimos(
    db: DbSession,
    situacao: str | None = Query(default=None),
    aluno: str | None = Query(default=None),
    matricula: str | None = Query(default=None),
    exemplar: str | None = Query(default=None),
    titulo: str | None = Query(default=None),
	page: Page = 1,
	page_size: PageSize = 50,
) -> list[EmprestimoRead]:
    return list_emprestimos(db, situacao, aluno, matricula, exemplar, titulo, page, page_size)


@router.get("/ativos", response_model=list[EmprestimoRead])
def listar_ativos(db: DbSession, page: Page = 1, page_size: PageSize = 50) -> list[EmprestimoRead]:
    return list_emprestimos(db, situacao="ativo", page=page, page_size=page_size)


@router.get("/atrasados", response_model=list[EmprestimoRead])
def listar_atrasados(db: DbSession, page: Page = 1, page_size: PageSize = 50) -> list[EmprestimoRead]:
    return list_emprestimos(db, situacao="atrasado", page=page, page_size=page_size)


@router.get("/devolvidos", response_model=list[EmprestimoRead])
def listar_devolvidos(db: DbSession, page: Page = 1, page_size: PageSize = 50) -> list[EmprestimoRead]:
    return list_emprestimos(db, situacao="devolvido", page=page, page_size=page_size)


@router.get("/historico/aluno/{aluno_id}", response_model=list[EmprestimoRead])
def historico_do_aluno(aluno_id: int, db: DbSession) -> list[EmprestimoRead]:
    return historico_aluno(db, aluno_id)


@router.get("/historico/exemplar/{exemplar_id}", response_model=list[EmprestimoRead])
def historico_do_exemplar(exemplar_id: int, db: DbSession) -> list[EmprestimoRead]:
    return historico_exemplar(db, exemplar_id)


@router.get("/historico/livro/{livro_id}", response_model=list[EmprestimoRead])
def historico_do_livro(livro_id: int, db: DbSession) -> list[EmprestimoRead]:
    return historico_livro(db, livro_id)


@router.get("/{emprestimo_id}", response_model=EmprestimoRead)
def consultar_emprestimo(emprestimo_id: int, db: DbSession) -> EmprestimoRead:
    return get_emprestimo_or_404(db, emprestimo_id)


@router.post("/{emprestimo_id}/devolucao", response_model=EmprestimoRead)
def devolver(
    emprestimo_id: int,
    data: DevolucaoCreate,
    db: DbSession,
    usuario: Usuario = Depends(get_current_user),
) -> EmprestimoRead:
    return devolver_emprestimo(db, get_emprestimo_or_404(db, emprestimo_id), data, usuario)


@router.post("/{emprestimo_id}/renovacao", response_model=EmprestimoRead)
def renovar(
    emprestimo_id: int,
    data: RenovacaoCreate,
    db: DbSession,
) -> EmprestimoRead:
    return renovar_emprestimo(db, get_emprestimo_or_404(db, emprestimo_id), data)


@router.post("/{emprestimo_id}/cancelamento", response_model=EmprestimoRead)
def cancelar(emprestimo_id: int, db: DbSession) -> EmprestimoRead:
    return cancelar_emprestimo(db, get_emprestimo_or_404(db, emprestimo_id))
