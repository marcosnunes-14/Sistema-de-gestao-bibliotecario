import json
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.models.auditoria import Auditoria
from app.models.usuario import Usuario


def registrar(
    db: Session,
    acao: str,
    entidade: str,
    entidade_id: int | None = None,
    usuario: Usuario | None = None,
    detalhes: dict | None = None,
) -> Auditoria:
    registro = Auditoria(
        usuario_id=usuario.id if usuario else None,
        acao=acao,
        entidade=entidade,
        entidade_id=entidade_id,
        detalhes=json.dumps(detalhes, ensure_ascii=True) if detalhes else None,
        criado_em=datetime.now(),
    )
    db.add(registro)
    return registro


def listar(
    db: Session,
    page: int = 1,
    page_size: int = 50,
    usuario_id: int | None = None,
    acao: str | None = None,
    entidade: str | None = None,
    desde: datetime | None = None,
    ate: datetime | None = None,
) -> list[Auditoria]:
    query = select(Auditoria).options(joinedload(Auditoria.usuario)).order_by(Auditoria.criado_em.desc())
    if usuario_id is not None:
        query = query.where(Auditoria.usuario_id == usuario_id)
    if acao:
        query = query.where(Auditoria.acao == acao)
    if entidade:
        query = query.where(Auditoria.entidade == entidade)
    if desde:
        query = query.where(Auditoria.criado_em >= desde)
    if ate:
        query = query.where(Auditoria.criado_em <= ate)
    return list(db.scalars(query.offset((page - 1) * page_size).limit(page_size)).unique().all())
