from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Table, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

livros_autores = Table(
    "livros_autores",
    Base.metadata,
    Column("livro_id", ForeignKey("livros.id", ondelete="CASCADE"), primary_key=True),
    Column("autor_id", ForeignKey("autores.id", ondelete="CASCADE"), primary_key=True),
)


class Autor(Base):
    __tablename__ = "autores"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    nome: Mapped[str] = mapped_column(String(200), unique=True, nullable=False, index=True)
    ativo: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default="1")

    livros: Mapped[list["Livro"]] = relationship(
        secondary=livros_autores,
        back_populates="autores",
    )


class Editora(Base):
    __tablename__ = "editoras"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    nome: Mapped[str] = mapped_column(String(200), unique=True, nullable=False, index=True)
    ativo: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default="1")

    livros: Mapped[list["Livro"]] = relationship(back_populates="editora")


class Livro(Base):
    __tablename__ = "livros"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    numero_registro: Mapped[str | None] = mapped_column(String(50), unique=True, nullable=True, index=True)
    titulo: Mapped[str] = mapped_column(String(300), nullable=False, index=True)
    tipo_obra: Mapped[str | None] = mapped_column(String(100), nullable=True)
    pi: Mapped[str | None] = mapped_column(String(100), nullable=True)
    cdd: Mapped[str | None] = mapped_column(String(50), nullable=True)
    cutter: Mapped[str | None] = mapped_column(String(50), nullable=True)
    assunto: Mapped[str | None] = mapped_column(Text, nullable=True)
    local: Mapped[str | None] = mapped_column(String(200), nullable=True)
    volumes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    serie: Mapped[str | None] = mapped_column(String(200), nullable=True)
    observacoes: Mapped[str | None] = mapped_column(Text, nullable=True)
    subtitulo: Mapped[str | None] = mapped_column(String(300), nullable=True)
    isbn: Mapped[str | None] = mapped_column(String(13), unique=True, nullable=True, index=True)
    editora_id: Mapped[int | None] = mapped_column(ForeignKey("editoras.id"), nullable=True, index=True)
    ano_publicacao: Mapped[int | None] = mapped_column(Integer, nullable=True)
    edicao: Mapped[str | None] = mapped_column(String(50), nullable=True)
    categoria_id: Mapped[int | None] = mapped_column(ForeignKey("categorias.id"), nullable=True, index=True)
    idioma: Mapped[str] = mapped_column(String(50), nullable=False, default="Português", server_default="Português")
    numero_paginas: Mapped[int | None] = mapped_column(Integer, nullable=True)
    descricao: Mapped[str | None] = mapped_column(Text, nullable=True)
    ativo: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default="1")
    data_cadastro: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now())
    data_atualizacao: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now(), onupdate=func.now()
    )

    autores: Mapped[list[Autor]] = relationship(secondary=livros_autores, back_populates="livros")
    editora: Mapped[Editora | None] = relationship(back_populates="livros")
    categoria: Mapped["Categoria | None"] = relationship()
