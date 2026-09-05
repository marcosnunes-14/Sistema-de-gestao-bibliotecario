from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.dependencies import Page, PageSize
from app.core.security import require_admin
from app.db.session import get_db
from app.models.usuario import Usuario
from app.schemas.auditoria import AuditoriaRead
from app.services.auditoria import listar

router = APIRouter(dependencies=[Depends(require_admin)])
DbSession = Annotated[Session, Depends(get_db)]


@router.get("", response_model=list[AuditoriaRead])
def listar_auditoria(
    db: DbSession,
    page: Page = 1,
    page_size: PageSize = 50,
    usuario_id: int | None = Query(default=None, gt=0),
    acao: str | None = None,
    entidade: str | None = None,
    desde: datetime | None = None,
    ate: datetime | None = None,
) -> list[AuditoriaRead]:
    return [AuditoriaRead(
        id=item.id,
        usuario_id=item.usuario_id,
        usuario_nome=item.usuario.nome if item.usuario else None,
        acao=item.acao,
        entidade=item.entidade,
        entidade_id=item.entidade_id,
        detalhes=item.detalhes,
        criado_em=item.criado_em,
    ) for item in listar(db, page, page_size, usuario_id, acao, entidade, desde, ate)]