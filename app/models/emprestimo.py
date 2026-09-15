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
    aluno_id: Mapped[int | None] = mapped_column(ForeignKey("alunos.id"), nullable=True, index=True)
    exemplar_id: Mapped[int | None] = mapped_column(ForeignKey("exemplares.id"), nullable=True, index=True)
    nome_aluno: Mapped[str | None] = mapped_column(String(200), nullable=True)
    serie_aluno: Mapped[str | None] = mapped_column(String(50), nullable=True)
    codigo_livro: Mapped[str | None] = mapped_column(String(50), nullable=True)
    nome_livro: Mapped[str | None] = mapped_column(String(300), nullable=True)
    autor_livro: Mapped[str | None] = mapped_column(String(200), nullable=True)
    realizado_por_id: Mapped[int | None] = mapped_column(ForeignKey("usuarios.id"), nullable=True, index=True)
    devolvido_por_id: Mapped[int | None] = mapped_column(ForeignKey("usuarios.id"), nullable=True, index=True)
    data_emprestimo: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    data_entrega: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    data_prevista_devolucao: Mapped[datetime] = mapped_column(DateTime, nullable=False, index=True)
    data_devolucao: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    situacao_base: Mapped[SituacaoEmprestimo] = mapped_column(
        Enum(SituacaoEmprestimo),
        nullable=False,
        default=SituacaoEmprestimo.ATIVO,
        server_default=SituacaoEmprestimo.ATIVO.value,
    )
    observacoes: Mapped[str | None] = mapped_column(String(500), nullable=True)

    aluno: Mapped["Aluno | None"] = relationship()
    exemplar: Mapped["Exemplar | None"] = relationship()
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
        if self.nome_aluno:
            return self.nome_aluno
        if self.aluno:
            return self.aluno.nome_completo
        return "Aluno não informado"

    @property
    def serie_aluno_display(self) -> str | None:
        if self.serie_aluno:
            return self.serie_aluno
        if self.aluno:
            return self.aluno.serie_ano
        return None

    @property
    def exemplar_codigo(self) -> str:
        if self.codigo_livro:
            return self.codigo_livro
        if self.exemplar:
            return self.exemplar.codigo
        return "—"

    @property
    def livro_id(self) -> int | None:
        if self.exemplar:
            return self.exemplar.livro_id
        return None

    @property
    def livro_titulo(self) -> str:
        if self.nome_livro:
            return self.nome_livro
        if self.exemplar and self.exemplar.livro:
            return self.exemplar.livro.titulo
        return "Livro não informado"

    @property
    def autor_livro_display(self) -> str | None:
        if self.autor_livro:
            return self.autor_livro
        if self.exemplar and self.exemplar.livro:
            autores = getattr(self.exemplar.livro, 'autores', [])
            return ', '.join(author.nome for author in autores) if autores else None
        return None

    @property
    def data_entrega_value(self) -> datetime:
        return self.data_entrega or self.data_emprestimo

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
