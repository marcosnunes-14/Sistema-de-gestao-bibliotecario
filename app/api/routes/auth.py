from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.security import create_access_token, get_current_user
from app.db.session import get_db
from app.schemas.usuario import LoginRequest, TokenResponse, UsuarioRead
from app.services.usuarios import authenticate

router = APIRouter()
DbSession = Annotated[Session, Depends(get_db)]


@router.post("/login", response_model=TokenResponse)
def login(data: LoginRequest, db: DbSession) -> TokenResponse:
    usuario = authenticate(db, data.username, data.senha)
    try:
        token = create_access_token(usuario)
    except RuntimeError as error:
        raise HTTPException(
            status_code=503,
            detail="A autenticação ainda não foi configurada no ambiente.",
        ) from error
    return TokenResponse(access_token=token)


@router.get("/me", response_model=UsuarioRead)
def current_user(user=Depends(get_current_user)) -> UsuarioRead:
    return user
