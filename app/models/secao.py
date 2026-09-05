from sqlalchemy import Boolean, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class Secao(Base):
    __tablename__ = "secoes"
    __table_args__ = (
        UniqueConstraint("prateleira_id", "numero", name="uq_secao_prateleira_numero"),
        UniqueConstraint("codigo_localizacao", name="uq_secao_codigo_localizacao"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    prateleira_id: Mapped[int] = mapped_column(
        ForeignKey("prateleiras.id"),
        nullable=False,
        index=True,
    )
    numero: Mapped[int] = mapped_column(Integer, nullable=False)
    codigo_localizacao: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    categoria_id: Mapped[int | None] = mapped_column(
        ForeignKey("categorias.id"),
        nullable=True,
        index=True,
    )
    descricao: Mapped[str | None] = mapped_column(String(200), nullable=True)
    ativa: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    prateleira: Mapped["Prateleira"] = relationship(back_populates="secoes")
    categoria: Mapped["Categoria | None"] = relationship()
