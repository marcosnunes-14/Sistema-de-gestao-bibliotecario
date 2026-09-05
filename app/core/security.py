from datetime import datetime, timedelta, timezone
import os

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pwdlib import PasswordHash
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.usuario import PerfilUsuario, Usuario

password_hash = PasswordHash.recommended()
bearer_scheme = HTTPBearer(auto_error=False)


def get_secret_key() -> str:
    secret_key = os.getenv("SECRET_KEY")
    if not secret_key or len(secret_key) < 32:
        raise RuntimeError("A variável SECRET_KEY precisa ter pelo menos 32 caracteres.")
    return secret_key


def hash_password(password: str) -> str:
    return password_hash.hash(password)


def verify_password(password: str, hashed_password: str) -> bool:
    return password_hash.verify(password, hashed_password)


def create_access_token(user: Usuario) -> str:
    expires_minutes = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=expires_minutes)
    payload = {"sub": str(user.id), "exp": expires_at, "type": "access"}
    return jwt.encode(payload, get_secret_key(), algorithm="HS256")


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> Usuario:
    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Autenticação necessária.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if credentials is None:
        raise unauthorized
    try:
        payload = jwt.decode(credentials.credentials, get_secret_key(), algorithms=["HS256"])
        user_id = int(payload.get("sub", ""))
        if payload.get("type") != "access":
            raise ValueError
    except (jwt.InvalidTokenError, TypeError, ValueError, RuntimeError):
        raise unauthorized
    user = db.get(Usuario, user_id)
    if user is None or not user.ativo:
        raise unauthorized
    return user


def require_admin(user: Usuario = Depends(get_current_user)) -> Usuario:
    if user.perfil != PerfilUsuario.ADMINISTRADOR:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Apenas administradores podem executar esta operação.",
        )
    return user
