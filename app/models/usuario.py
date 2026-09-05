from datetime import datetime
from enum import StrEnum

from sqlalchemy import Boolean, DateTime, Enum, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class PerfilUsuario(StrEnum):
    ADMINISTRADOR = "administrador"
    BIBLIOTECARIO = "bibliotecario"


class Usuario(Base):
    __tablename__ = "usuarios"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    nome: Mapped[str] = mapped_column(String(200), nullable=False)
    username: Mapped[str] = mapped_column(String(80), unique=True, nullable=False, index=True)
    senha_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    perfil: Mapped[PerfilUsuario] = mapped_column(
        Enum(PerfilUsuario), nullable=False, default=PerfilUsuario.BIBLIOTECARIO
    )
    ativo: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default="1")
    data_criacao: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now())
    data_atualizacao: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now(), onupdate=func.now()
    )
    ultimo_login: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
