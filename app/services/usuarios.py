from datetime import datetime

from fastapi import HTTPException, status
from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.security import hash_password, verify_password
from app.models.usuario import PerfilUsuario, Usuario
from app.schemas.usuario import SenhaUpdate, UsuarioCreate, UsuarioUpdate
from app.schemas.usuario import SenhaAdminUpdate
from app.services.auditoria import registrar


def conflict(detail: str) -> HTTPException:
    return HTTPException(status_code=status.HTTP_409_CONFLICT, detail=detail)


def create_usuario(db: Session, data: UsuarioCreate, administrador: Usuario | None = None) -> Usuario:
    usuario = Usuario(
        nome=data.nome,
        username=data.username,
        senha_hash=hash_password(data.senha),
        perfil=data.perfil,
    )
    db.add(usuario)
    registrar(db, "criar", "usuario", None, administrador, {"username": data.username, "perfil": data.perfil.value})
    try:
        db.commit()
    except IntegrityError as error:
        db.rollback()
        raise conflict("Já existe um usuário com este login.") from error
    db.refresh(usuario)
    return usuario


def reset_usuario_password(db: Session, usuario: Usuario, data: SenhaAdminUpdate, administrador: Usuario) -> Usuario:
    usuario.senha_hash = hash_password(data.nova_senha)
    registrar(db, "redefinir_senha", "usuario", usuario.id, administrador)
    db.commit()
    db.refresh(usuario)
    return usuario


def list_usuarios(
    db: Session,
    page: int = 1,
    page_size: int = 50,
    search: str | None = None,
    perfil: PerfilUsuario | None = None,
    ativo: bool | None = None,
) -> list[Usuario]:
    query = select(Usuario).order_by(Usuario.nome).offset((page - 1) * page_size).limit(page_size)
    if search:
        term = f"%{search.strip()}%"
        query = query.where(or_(Usuario.nome.ilike(term), Usuario.username.ilike(term)))
    if perfil is not None:
        query = query.where(Usuario.perfil == perfil)
    if ativo is not None:
        query = query.where(Usuario.ativo == ativo)
    return list(db.scalars(query).all())


def get_usuario_or_404(db: Session, usuario_id: int) -> Usuario:
    usuario = db.get(Usuario, usuario_id)
    if usuario is None:
        raise HTTPException(status_code=404, detail="Usuário não encontrado.")
    return usuario


def update_usuario(db: Session, usuario: Usuario, data: UsuarioUpdate, administrador: Usuario | None = None) -> Usuario:
    changes = data.model_dump(exclude_unset=True)
    if usuario.perfil == PerfilUsuario.ADMINISTRADOR and changes.get("perfil") not in (None, PerfilUsuario.ADMINISTRADOR):
        ensure_not_last_admin(db, usuario)
    for field, value in changes.items():
        setattr(usuario, field, value)
    registrar(db, "editar", "usuario", usuario.id, administrador, {"campos": list(changes)})
    try:
        db.commit()
    except IntegrityError as error:
        db.rollback()
        raise conflict("Não foi possível atualizar o usuário.") from error
    db.refresh(usuario)
    return usuario


def update_usuario_status(db: Session, usuario: Usuario, ativo: bool, administrador: Usuario | None = None) -> Usuario:
    if not ativo and usuario.perfil == PerfilUsuario.ADMINISTRADOR:
        ensure_not_last_admin(db, usuario)
    usuario.ativo = ativo
    registrar(db, "alterar_status", "usuario", usuario.id, administrador, {"ativo": ativo})
    db.commit()
    db.refresh(usuario)
    return usuario


def ensure_not_last_admin(db: Session, usuario: Usuario) -> None:
    admin_count = db.scalar(
        select(func.count(Usuario.id)).where(
            Usuario.perfil == PerfilUsuario.ADMINISTRADOR,
            Usuario.ativo.is_(True),
        )
    )
    if admin_count <= 1 and usuario.ativo:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="O sistema precisa manter pelo menos um administrador ativo.",
        )


def update_usuario_password(db: Session, usuario: Usuario, data: SenhaUpdate) -> Usuario:
    if not verify_password(data.senha_atual, usuario.senha_hash):
        raise HTTPException(status_code=400, detail="A senha atual está incorreta.")
    usuario.senha_hash = hash_password(data.nova_senha)
    db.commit()
    db.refresh(usuario)
    return usuario


def authenticate(db: Session, username: str, senha: str) -> Usuario:
    usuario = db.scalar(select(Usuario).where(Usuario.username == username.strip()))
    if usuario is None or not verify_password(senha, usuario.senha_hash):
        raise HTTPException(status_code=401, detail="Login ou senha inválidos.")
    if not usuario.ativo:
        raise HTTPException(status_code=401, detail="Usuário inativo.")
    usuario.ultimo_login = datetime.now()
    db.commit()
    db.refresh(usuario)
    return usuario
