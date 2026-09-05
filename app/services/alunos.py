from fastapi import HTTPException, status
from sqlalchemy import and_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.aluno import Aluno
from app.schemas.aluno import AlunoCreate, AlunoUpdate


def create_aluno(db: Session, data: AlunoCreate) -> Aluno:
    aluno = Aluno(**data.model_dump())
    db.add(aluno)
    try:
        db.commit()
    except IntegrityError as error:
        db.rollback()
        if "matricula" in str(error.orig).lower() or "unique" in str(error.orig).lower():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Já existe um aluno com esta matrícula.",
            ) from error
        raise
    db.refresh(aluno)
    return aluno


def list_alunos(
    db: Session,
    nome: str | None = None,
    matricula: str | None = None,
    turma: str | None = None,
    page: int = 1,
    page_size: int = 50,
) -> list[Aluno]:
    query = select(Aluno).order_by(Aluno.nome_completo)
    filters = []
    if nome:
        filters.append(Aluno.nome_completo.ilike(f"%{nome.strip()}%"))
    if matricula:
        filters.append(Aluno.matricula.ilike(f"%{matricula.strip()}%"))
    if turma:
        filters.append(Aluno.turma.ilike(f"%{turma.strip()}%"))
    if filters:
        query = query.where(and_(*filters))
    return list(db.scalars(query.offset((page - 1) * page_size).limit(page_size)).all())


def get_aluno_or_404(db: Session, aluno_id: int) -> Aluno:
    aluno = db.get(Aluno, aluno_id)
    if aluno is None:
        raise HTTPException(status_code=404, detail="Aluno não encontrado.")
    return aluno


def update_aluno(db: Session, aluno: Aluno, data: AlunoUpdate) -> Aluno:
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(aluno, field, value)
    try:
        db.commit()
    except IntegrityError as error:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Já existe um aluno com esta matrícula.",
        ) from error
    db.refresh(aluno)
    return aluno


def update_aluno_status(db: Session, aluno: Aluno, ativo: bool) -> Aluno:
    aluno.ativo = ativo
    db.commit()
    db.refresh(aluno)
    return aluno
