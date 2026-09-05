from datetime import datetime

from sqlalchemy import Boolean, DateTime, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class Prateleira(Base):
    __tablename__ = "prateleiras"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    numero: Mapped[int] = mapped_column(Integer, unique=True, index=True, nullable=False)
    descricao: Mapped[str | None] = mapped_column(String(200), nullable=True)
    finalidade: Mapped[str | None] = mapped_column(String(100), nullable=True)
    genero_principal: Mapped[str | None] = mapped_column(String(150), nullable=True)
    ativa: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    observacoes: Mapped[str | None] = mapped_column(Text, nullable=True)
    data_criacao: Mapped[datetime] = mapped_column(
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

    secoes: Mapped[list["Secao"]] = relationship(
        back_populates="prateleira",
        cascade="all, delete-orphan",
    )
