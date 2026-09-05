from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class Auditoria(Base):
    __tablename__ = "auditoria"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    usuario_id: Mapped[int | None] = mapped_column(ForeignKey("usuarios.id"), nullable=True, index=True)
    acao: Mapped[str] = mapped_column(String(80), nullable=False, index=True)
    entidade: Mapped[str] = mapped_column(String(80), nullable=False, index=True)
    entidade_id: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)
    detalhes: Mapped[str | None] = mapped_column(Text, nullable=True)
    criado_em: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now(), index=True)

    usuario: Mapped["Usuario | None"] = relationship()
