from datetime import datetime
from enum import StrEnum

from sqlalchemy import DateTime, Enum, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class SituacaoExemplar(StrEnum):
    DISPONIVEL = "disponivel"
    EMPRESTADO = "emprestado"
    PERDIDO = "perdido"
    BAIXADO = "baixado"
    MANUTENCAO = "manutencao"


class Exemplar(Base):
    __tablename__ = "exemplares"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    codigo: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    livro_id: Mapped[int] = mapped_column(ForeignKey("livros.id"), nullable=False, index=True)
    prateleira_id: Mapped[int | None] = mapped_column(ForeignKey("prateleiras.id"), nullable=True, index=True)
    secao_id: Mapped[int | None] = mapped_column(ForeignKey("secoes.id"), nullable=True, index=True)
    cadastrado_por_id: Mapped[int | None] = mapped_column(ForeignKey("usuarios.id"), nullable=True, index=True)
    situacao: Mapped[SituacaoExemplar] = mapped_column(
        Enum(SituacaoExemplar),
        nullable=False,
        default=SituacaoExemplar.DISPONIVEL,
        server_default=SituacaoExemplar.DISPONIVEL.value,
    )
    estado_conservacao: Mapped[str | None] = mapped_column(String(50), nullable=True)
    data_cadastro: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now())
    situacao_alterada_em: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    situacao_alterada_por_id: Mapped[int | None] = mapped_column(ForeignKey("usuarios.id"), nullable=True, index=True)

    livro: Mapped["Livro"] = relationship()
    prateleira: Mapped["Prateleira | None"] = relationship()
    secao: Mapped["Secao | None"] = relationship()
    cadastrado_por: Mapped["Usuario | None"] = relationship(foreign_keys=[cadastrado_por_id])
    situacao_alterada_por: Mapped["Usuario | None"] = relationship(foreign_keys=[situacao_alterada_por_id])
