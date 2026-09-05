from datetime import datetime

from sqlalchemy import Boolean, DateTime, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class Aluno(Base):
    __tablename__ = "alunos"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    nome_completo: Mapped[str] = mapped_column(String(200), nullable=False)
    matricula: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    turma: Mapped[str] = mapped_column(String(50), nullable=False)
    serie_ano: Mapped[str] = mapped_column(String(50), nullable=False)
    turno: Mapped[str] = mapped_column(String(30), nullable=False)
    telefone: Mapped[str | None] = mapped_column(String(30), nullable=True)
    nome_responsavel: Mapped[str | None] = mapped_column(String(200), nullable=True)
    telefone_responsavel: Mapped[str | None] = mapped_column(String(30), nullable=True)
    ativo: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    data_cadastro: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        server_default=func.now(),
    )
    data_atualizacao: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )
