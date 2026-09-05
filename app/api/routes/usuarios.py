from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.security import require_admin
from app.db.session import get_db
from app.api.dependencies import Page, PageSize
from app.models.usuario import PerfilUsuario, Usuario
from app.schemas.usuario import (
    SenhaUpdate,
    SenhaAdminUpdate,
    StatusUsuarioUpdate,
    UsuarioCreate,
    UsuarioRead,
    UsuarioUpdate,
)
from app.services.usuarios import (
    create_usuario,
    get_usuario_or_404,
    list_usuarios,
    update_usuario,
    update_usuario_password,
    reset_usuario_password,
    update_usuario_status,
)

router = APIRouter(dependencies=[Depends(require_admin)])
DbSession = Annotated[Session, Depends(get_db)]


@router.post("", response_model=UsuarioRead, status_code=status.HTTP_201_CREATED)
def cadastrar_usuario(data: UsuarioCreate, db: DbSession, administrador: Usuario = Depends(require_admin)) -> UsuarioRead:
    return create_usuario(db, data, administrador)


@router.get("", response_model=list[UsuarioRead])
def listar_usuarios(
    db: DbSession,
    page: Page = 1,
    page_size: PageSize = 50,
    search: str | None = Query(default=None, min_length=1),
    perfil: PerfilUsuario | None = None,
    ativo: bool | None = None,
) -> list[UsuarioRead]:
    return list_usuarios(db, page=page, page_size=page_size, search=search, perfil=perfil, ativo=ativo)


@router.get("/{usuario_id}", response_model=UsuarioRead)
def consultar_usuario(usuario_id: int, db: DbSession) -> UsuarioRead:
    return get_usuario_or_404(db, usuario_id)


@router.put("/{usuario_id}", response_model=UsuarioRead)
def editar_usuario(usuario_id: int, data: UsuarioUpdate, db: DbSession, administrador: Usuario = Depends(require_admin)) -> UsuarioRead:
    return update_usuario(db, get_usuario_or_404(db, usuario_id), data, administrador)


@router.patch("/{usuario_id}/status", response_model=UsuarioRead)
def alterar_status_usuario(
    usuario_id: int,
    data: StatusUsuarioUpdate,
    db: DbSession,
    administrador: Usuario = Depends(require_admin),
) -> UsuarioRead:
    return update_usuario_status(db, get_usuario_or_404(db, usuario_id), data.ativo, administrador)


@router.patch("/{usuario_id}/senha", response_model=UsuarioRead)
def alterar_senha_usuario(
    usuario_id: int,
    data: SenhaUpdate,
    db: DbSession,
) -> UsuarioRead:
    return update_usuario_password(db, get_usuario_or_404(db, usuario_id), data)


@router.patch("/{usuario_id}/senha/admin", response_model=UsuarioRead)
def redefinir_senha_usuario(
    usuario_id: int,
    data: SenhaAdminUpdate,
    db: DbSession,
    administrador: Usuario = Depends(require_admin),
) -> UsuarioRead:
    return reset_usuario_password(db, get_usuario_or_404(db, usuario_id), data, administrador)
