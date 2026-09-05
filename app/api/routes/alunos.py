from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.api.dependencies import Page, PageSize
from app.schemas.aluno import AlunoCreate, AlunoRead, AlunoStatusUpdate, AlunoUpdate
from app.services.alunos import (
	create_aluno,
	get_aluno_or_404,
	list_alunos,
	update_aluno,
	update_aluno_status,
)

router = APIRouter()
DbSession = Annotated[Session, Depends(get_db)]


@router.post("", response_model=AlunoRead, status_code=status.HTTP_201_CREATED)
def cadastrar_aluno(data: AlunoCreate, db: DbSession) -> AlunoRead:
	return create_aluno(db, data)


@router.get("", response_model=list[AlunoRead])
def listar_alunos(
	db: DbSession,
	nome: str | None = Query(default=None),
	matricula: str | None = Query(default=None),
	turma: str | None = Query(default=None),
	page: Page = 1,
	page_size: PageSize = 50,
) -> list[AlunoRead]:
	return list_alunos(db, nome=nome, matricula=matricula, turma=turma, page=page, page_size=page_size)


@router.get("/{aluno_id}", response_model=AlunoRead)
def consultar_aluno(aluno_id: int, db: DbSession) -> AlunoRead:
	return get_aluno_or_404(db, aluno_id)


@router.put("/{aluno_id}", response_model=AlunoRead)
def editar_aluno(aluno_id: int, data: AlunoUpdate, db: DbSession) -> AlunoRead:
	aluno = get_aluno_or_404(db, aluno_id)
	return update_aluno(db, aluno, data)


@router.patch("/{aluno_id}/status", response_model=AlunoRead)
def alterar_status_aluno(
	aluno_id: int,
	data: AlunoStatusUpdate,
	db: DbSession,
) -> AlunoRead:
	aluno = get_aluno_or_404(db, aluno_id)
	return update_aluno_status(db, aluno, data.ativo)
