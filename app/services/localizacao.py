from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.categoria import Categoria
from app.models.prateleira import Prateleira
from app.models.secao import Secao
from app.schemas.localizacao import (
    CategoriaCreate,
    CategoriaUpdate,
    PrateleiraCreate,
    PrateleiraUpdate,
    SecaoCreate,
    SecaoUpdate,
)


def _duplicate_error(detail: str) -> HTTPException:
    return HTTPException(status_code=status.HTTP_409_CONFLICT, detail=detail)


def create_categoria(db: Session, data: CategoriaCreate) -> Categoria:
    categoria = Categoria(nome=data.nome.strip(), descricao=data.descricao)
    db.add(categoria)
    try:
        db.commit()
    except IntegrityError as error:
        db.rollback()
        raise _duplicate_error("Já existe uma categoria com este nome.") from error
    db.refresh(categoria)
    return categoria


def list_categorias(db: Session) -> list[Categoria]:
    return list(db.scalars(select(Categoria).order_by(Categoria.nome)).all())


def get_categoria_or_404(db: Session, categoria_id: int) -> Categoria:
    categoria = db.get(Categoria, categoria_id)
    if categoria is None:
        raise HTTPException(status_code=404, detail="Categoria não encontrada.")
    return categoria


def update_categoria(db: Session, categoria: Categoria, data: CategoriaUpdate) -> Categoria:
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(categoria, field, value.strip() if field == "nome" else value)
    try:
        db.commit()
    except IntegrityError as error:
        db.rollback()
        raise _duplicate_error("Já existe uma categoria com este nome.") from error
    db.refresh(categoria)
    return categoria


def update_categoria_status(db: Session, categoria: Categoria, ativo: bool) -> Categoria:
    categoria.ativo = ativo
    db.commit()
    db.refresh(categoria)
    return categoria


def create_prateleira(db: Session, data: PrateleiraCreate) -> Prateleira:
    prateleira = Prateleira(**data.model_dump())
    db.add(prateleira)
    try:
        db.commit()
    except IntegrityError as error:
        db.rollback()
        raise _duplicate_error("Já existe uma prateleira com este número.") from error
    db.refresh(prateleira)
    return prateleira


def list_prateleiras(db: Session) -> list[Prateleira]:
    return list(db.scalars(select(Prateleira).order_by(Prateleira.numero)).all())


def get_prateleira_or_404(db: Session, prateleira_id: int) -> Prateleira:
    prateleira = db.get(Prateleira, prateleira_id)
    if prateleira is None:
        raise HTTPException(status_code=404, detail="Prateleira não encontrada.")
    return prateleira


def update_prateleira(db: Session, prateleira: Prateleira, data: PrateleiraUpdate) -> Prateleira:
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(prateleira, field, value)
    try:
        db.commit()
    except IntegrityError as error:
        db.rollback()
        raise _duplicate_error("Já existe uma prateleira com este número.") from error
    db.refresh(prateleira)
    return prateleira


def update_prateleira_status(db: Session, prateleira: Prateleira, ativa: bool) -> Prateleira:
    prateleira.ativa = ativa
    db.commit()
    db.refresh(prateleira)
    return prateleira


def _get_categoria(db: Session, categoria_id: int | None) -> Categoria | None:
    if categoria_id is None:
        return None
    categoria = db.get(Categoria, categoria_id)
    if categoria is None:
        raise HTTPException(status_code=404, detail="Categoria não encontrada.")
    return categoria


def _location_code(prateleira_numero: int, secao_numero: int) -> str:
    return f"P{prateleira_numero:02d}-S{secao_numero:02d}"


def create_secao(db: Session, prateleira: Prateleira, data: SecaoCreate) -> Secao:
    _get_categoria(db, data.categoria_id)
    secao = Secao(
        prateleira_id=prateleira.id,
        numero=data.numero,
        codigo_localizacao=_location_code(prateleira.numero, data.numero),
        categoria_id=data.categoria_id,
        descricao=data.descricao,
    )
    db.add(secao)
    try:
        db.commit()
    except IntegrityError as error:
        db.rollback()
        raise _duplicate_error("Esta seção já existe nesta prateleira.") from error
    db.refresh(secao)
    return secao


def list_secoes(db: Session, prateleira_id: int | None = None) -> list[Secao]:
    query = select(Secao).order_by(Secao.codigo_localizacao)
    if prateleira_id is not None:
        query = query.where(Secao.prateleira_id == prateleira_id)
    return list(db.scalars(query).all())


def get_secao_or_404(db: Session, secao_id: int) -> Secao:
    secao = db.get(Secao, secao_id)
    if secao is None:
        raise HTTPException(status_code=404, detail="Seção não encontrada.")
    return secao


def update_secao(db: Session, secao: Secao, data: SecaoUpdate) -> Secao:
    values = data.model_dump(exclude_unset=True)
    if "prateleira_id" in values:
        prateleira = get_prateleira_or_404(db, values["prateleira_id"])
        secao.prateleira_id = prateleira.id
    else:
        prateleira = get_prateleira_or_404(db, secao.prateleira_id)
    for field in ("numero", "categoria_id", "descricao"):
        if field in values:
            setattr(secao, field, values[field])
    _get_categoria(db, secao.categoria_id)
    secao.codigo_localizacao = _location_code(prateleira.numero, secao.numero)
    try:
        db.commit()
    except IntegrityError as error:
        db.rollback()
        raise _duplicate_error("Esta seção já existe nesta prateleira.") from error
    db.refresh(secao)
    return secao


def update_secao_status(db: Session, secao: Secao, ativa: bool) -> Secao:
    secao.ativa = ativa
    db.commit()
    db.refresh(secao)
    return secao
