from datetime import datetime
from enum import StrEnum

from sqlalchemy import DateTime, Enum, ForeignKey, Index, String, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class SituacaoEmprestimo(StrEnum):
    ATIVO = "ativo"
    DEVOLVIDO = "devolvido"
    CANCELADO = "cancelado"


class Emprestimo(Base):
    __tablename__ = "emprestimos"
    __table_args__ = (
        Index(
            "uq_emprestimo_exemplar_ativo",
            "exemplar_id",
            unique=True,
            sqlite_where=text("situacao_base = 'ATIVO'"),
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    aluno_id: Mapped[int] = mapped_column(ForeignKey("alunos.id"), nullable=False, index=True)
    exemplar_id: Mapped[int] = mapped_column(ForeignKey("exemplares.id"), nullable=False, index=True)
    realizado_por_id: Mapped[int | None] = mapped_column(ForeignKey("usuarios.id"), nullable=True, index=True)
    devolvido_por_id: Mapped[int | None] = mapped_column(ForeignKey("usuarios.id"), nullable=True, index=True)
    data_emprestimo: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    data_prevista_devolucao: Mapped[datetime] = mapped_column(DateTime, nullable=False, index=True)
    data_devolucao: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    situacao_base: Mapped[SituacaoEmprestimo] = mapped_column(
        Enum(SituacaoEmprestimo),
        nullable=False,
        default=SituacaoEmprestimo.ATIVO,
        server_default=SituacaoEmprestimo.ATIVO.value,
    )
    observacoes: Mapped[str | None] = mapped_column(String(500), nullable=True)

    aluno: Mapped["Aluno"] = relationship()
    exemplar: Mapped["Exemplar"] = relationship()
    realizado_por: Mapped["Usuario | None"] = relationship(foreign_keys=[realizado_por_id])
    devolvido_por: Mapped["Usuario | None"] = relationship(foreign_keys=[devolvido_por_id])
    renovacoes: Mapped[list["Renovacao"]] = relationship(
        back_populates="emprestimo",
        cascade="all, delete-orphan",
        order_by="Renovacao.data_renovacao",
    )

    @property
    def situacao(self) -> str:
        if self.situacao_base == SituacaoEmprestimo.DEVOLVIDO:
            return SituacaoEmprestimo.DEVOLVIDO.value
        if self.situacao_base == SituacaoEmprestimo.CANCELADO:
            return SituacaoEmprestimo.CANCELADO.value
        if self.data_prevista_devolucao < datetime.now():
            return "atrasado"
        return SituacaoEmprestimo.ATIVO.value

    @property
    def aluno_nome(self) -> str:
        return self.aluno.nome_completo

    @property
    def exemplar_codigo(self) -> str:
        return self.exemplar.codigo

    @property
    def livro_id(self) -> int:
        return self.exemplar.livro_id

    @property
    def livro_titulo(self) -> str:
        return self.exemplar.livro.titulo

    @property
    def realizado_por_nome(self) -> str | None:
        return self.realizado_por.nome if self.realizado_por else None

    @property
    def devolvido_por_nome(self) -> str | None:
        return self.devolvido_por.nome if self.devolvido_por else None


class Renovacao(Base):
    __tablename__ = "renovacoes_emprestimo"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    emprestimo_id: Mapped[int] = mapped_column(
        ForeignKey("emprestimos.id"), nullable=False, index=True
    )
    data_anterior_devolucao: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    nova_data_prevista_devolucao: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    data_renovacao: Mapped[datetime] = mapped_column(DateTime, nullable=False)

    emprestimo: Mapped[Emprestimo] = relationship(back_populates="renovacoes")
