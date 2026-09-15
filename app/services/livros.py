from fastapi import HTTPException, status
from sqlalchemy import and_, func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from app.models.categoria import Categoria
from app.models.exemplar import Exemplar
from app.models.livro import Autor, Editora, Livro
from app.models.exemplar import SituacaoExemplar
from app.models.prateleira import Prateleira
from app.models.secao import Secao
from app.schemas.livro import (
    AutorCreate,
    AutorUpdate,
    EditoraCreate,
    EditoraUpdate,
    LivroCreate,
    LivroUpdate,
    normalize_isbn,
)


def duplicate(detail: str) -> HTTPException:
    return HTTPException(status_code=status.HTTP_409_CONFLICT, detail=detail)


def _ensure_ids_exist(db: Session, model, ids: list[int], label: str):
    records = list(db.scalars(select(model).where(model.id.in_(ids))).all())
    found = {record.id for record in records}
    missing = [record_id for record_id in ids if record_id not in found]
    if missing:
        raise HTTPException(status_code=404, detail=f"{label} não encontrado: {missing[0]}.")
    return records


def create_autor(db: Session, data: AutorCreate) -> Autor:
    autor = Autor(nome=data.nome.strip())
    db.add(autor)
    try:
        db.commit()
    except IntegrityError as error:
        db.rollback()
        raise duplicate("Já existe um autor com este nome.") from error
    db.refresh(autor)
    return autor


def list_autores(db: Session, nome: str | None = None) -> list[Autor]:
    query = select(Autor).order_by(Autor.nome)
    if nome:
        query = query.where(Autor.nome.ilike(f"%{nome.strip()}%"))
    return list(db.scalars(query).all())


def get_autor_or_404(db: Session, autor_id: int) -> Autor:
    autor = db.get(Autor, autor_id)
    if autor is None:
        raise HTTPException(status_code=404, detail="Autor não encontrado.")
    return autor


def update_autor(db: Session, autor: Autor, data: AutorUpdate) -> Autor:
    autor.nome = data.nome.strip()
    try:
        db.commit()
    except IntegrityError as error:
        db.rollback()
        raise duplicate("Já existe um autor com este nome.") from error
    db.refresh(autor)
    return autor


def create_editora(db: Session, data: EditoraCreate) -> Editora:
    editora = Editora(nome=data.nome.strip())
    db.add(editora)
    try:
        db.commit()
    except IntegrityError as error:
        db.rollback()
        raise duplicate("Já existe uma editora com este nome.") from error
    db.refresh(editora)
    return editora


def list_editoras(db: Session, nome: str | None = None) -> list[Editora]:
    query = select(Editora).order_by(Editora.nome)
    if nome:
        query = query.where(Editora.nome.ilike(f"%{nome.strip()}%"))
    return list(db.scalars(query).all())


def get_editora_or_404(db: Session, editora_id: int) -> Editora:
    editora = db.get(Editora, editora_id)
    if editora is None:
        raise HTTPException(status_code=404, detail="Editora não encontrada.")
    return editora


def update_editora(db: Session, editora: Editora, data: EditoraUpdate) -> Editora:
    editora.nome = data.nome.strip()
    try:
        db.commit()
    except IntegrityError as error:
        db.rollback()
        raise duplicate("Já existe uma editora com este nome.") from error
    db.refresh(editora)
    return editora


def update_status(record, ativo: bool, db: Session):
    record.ativo = ativo
    db.commit()
    db.refresh(record)
    return record


def _authors_from_data(db: Session, data: LivroCreate | LivroUpdate) -> list[Autor] | None:
    if data.autor_ids is not None:
        return _ensure_ids_exist(db, Autor, data.autor_ids, "Autor")
    if not data.autores:
        return None
    names = [name.strip() for name in data.autores.replace(";", ",").split(",") if name.strip()]
    authors = []
    for name in dict.fromkeys(names):
        author = db.scalar(select(Autor).where(Autor.nome.ilike(name)))
        if author is None:
            author = Autor(nome=name)
            db.add(author)
            db.flush()
        authors.append(author)
    return authors


def _references(db: Session, data: LivroCreate | LivroUpdate) -> tuple[list[Autor] | None, Editora | None, Categoria | None]:
    authors = _authors_from_data(db, data)
    if data.editora:
        publisher = db.scalar(select(Editora).where(Editora.nome.ilike(data.editora)))
        if publisher is None:
            publisher = Editora(nome=data.editora)
            db.add(publisher)
            db.flush()
    else:
        publisher = get_editora_or_404(db, data.editora_id) if data.editora_id is not None else None
    category = db.get(Categoria, data.categoria_id) if data.categoria_id is not None else None
    if data.categoria_id is not None and category is None:
        raise HTTPException(status_code=404, detail="Categoria não encontrada.")
    return authors, publisher, category


def _book_query():
    return select(Livro).options(selectinload(Livro.autores)).order_by(Livro.titulo)


def _ensure_unique_numero_registro(db: Session, numero_registro: str | None, current_id: int | None = None) -> None:
    if numero_registro is None:
        return
    normalized = numero_registro.strip()
    if not normalized:
        return
    query = select(Livro).where(Livro.numero_registro == normalized)
    if current_id is not None:
        query = query.where(Livro.id != current_id)
    existing = db.scalar(query)
    if existing is not None:
        raise duplicate("Este número de registro já está sendo utilizado por outro livro.")


def _duplicate_book(db: Session, data: LivroCreate | LivroUpdate, current_id: int | None = None) -> Livro | None:
    return None


def _get_or_create_default_shelf(db: Session) -> Prateleira:
    shelf = db.scalar(select(Prateleira).where(Prateleira.numero == 1))
    if shelf is None:
        shelf = Prateleira(numero=1, descricao="Prateleira 01")
        db.add(shelf)
        db.flush()
    return shelf


def create_livro(db: Session, data: LivroCreate) -> Livro:
    _ensure_unique_numero_registro(db, data.numero_registro)
    authors, publisher, _ = _references(db, data)
    shelf = db.get(Prateleira, data.prateleira_id) if data.prateleira_id is not None else _get_or_create_default_shelf(db)
    if shelf is None:
        raise HTTPException(status_code=404, detail="Prateleira não encontrada.")
    if data.secao_id is not None:
        secao = db.get(Secao, data.secao_id)
        if secao is None or secao.prateleira_id != shelf.id:
            raise HTTPException(status_code=422, detail="A seção não pertence à prateleira informada.")
    values = data.model_dump(exclude={"autor_ids", "autores", "editora", "numero_exemplares", "prateleira_id", "secao_id"})
    values["editora_id"] = publisher.id if publisher else None
    livro = Livro(**values, autores=authors or [])
    db.add(livro)
    try:
        db.flush()
        base_code = livro.numero_registro or f"LIVRO-{livro.id}"
        for index in range(1, data.numero_exemplares + 1):
            db.add(Exemplar(
                codigo=f"{base_code}-{index:03d}",
                livro_id=livro.id,
                situacao=SituacaoExemplar.DISPONIVEL,
                prateleira_id=shelf.id,
                secao_id=data.secao_id,
            ))
        db.commit()
    except IntegrityError as error:
        db.rollback()
        if data.numero_registro and data.numero_registro.strip():
            raise duplicate("Este número de registro já está sendo utilizado por outro livro.") from error
        raise duplicate("Não foi possível cadastrar este livro.") from error
    db.refresh(livro)
    return livro


def list_livros(
    db: Session,
    titulo: str | None = None,
    autor: str | None = None,
    isbn: str | None = None,
    categoria_id: int | None = None,
    editora_id: int | None = None,
    categoria: str | None = None,
    editora: str | None = None,
    page: int = 1,
    page_size: int = 50,
) -> list[Livro]:
    query = _book_query()
    filters = []
    if titulo:
        filters.append(Livro.titulo.ilike(f"%{titulo.strip()}%"))
    if isbn:
        try:
            normalized_isbn = normalize_isbn(isbn)
        except ValueError as error:
            raise HTTPException(status_code=422, detail=str(error)) from error
        filters.append(Livro.isbn == normalized_isbn)
    if categoria_id:
        filters.append(Livro.categoria_id == categoria_id)
    if editora_id:
        filters.append(Livro.editora_id == editora_id)
    if categoria:
        query = query.join(Livro.categoria)
        filters.append(Categoria.nome.ilike(f"%{categoria.strip()}%"))
    if editora:
        query = query.join(Livro.editora)
        filters.append(Editora.nome.ilike(f"%{editora.strip()}%"))
    if autor:
        query = query.join(Livro.autores)
        filters.append(Autor.nome.ilike(f"%{autor.strip()}%"))
    if filters:
        query = query.where(and_(*filters)).distinct()
    return list(
        db.scalars(query.offset((page - 1) * page_size).limit(page_size)).unique().all()
    )


def get_livro_or_404(db: Session, livro_id: int) -> Livro:
    livro = db.scalar(_book_query().where(Livro.id == livro_id))
    if livro is None:
        raise HTTPException(status_code=404, detail="Livro não encontrado.")
    return livro


def update_livro(db: Session, livro: Livro, data: LivroUpdate) -> Livro:
    if data.numero_registro is not None:
        _ensure_unique_numero_registro(db, data.numero_registro, current_id=livro.id)
    values = data.model_dump(exclude_unset=True)
    if "autor_ids" in values or "autores" in values:
        authors = _authors_from_data(db, data)
        if authors is not None:
            livro.autores = authors
        values.pop("autor_ids", None)
        values.pop("autores", None)
    if "editora" in values:
        publisher = _references(db, data)[1]
        values["editora_id"] = publisher.id if publisher else None
        values.pop("editora")
    if "editora_id" in values and values["editora_id"] is not None:
        get_editora_or_404(db, values["editora_id"])
    if "categoria_id" in values and values["categoria_id"] is not None and db.get(Categoria, values["categoria_id"]) is None:
        raise HTTPException(status_code=404, detail="Categoria não encontrada.")
    prateleira_id = values.pop("prateleira_id", None)
    secao_id = values.pop("secao_id", None)
    requested_quantity = values.pop("numero_exemplares", None)
    if prateleira_id is not None:
        if db.get(Prateleira, prateleira_id) is None:
            raise HTTPException(status_code=404, detail="Prateleira não encontrada.")
        if secao_id is not None:
            secao = db.get(Secao, secao_id)
            if secao is None or secao.prateleira_id != prateleira_id:
                raise HTTPException(status_code=422, detail="A seção não pertence à prateleira informada.")
        for exemplar in db.scalars(select(Exemplar).where(Exemplar.livro_id == livro.id)).all():
            exemplar.prateleira_id = prateleira_id
            exemplar.secao_id = secao_id
    elif secao_id is not None:
        raise HTTPException(status_code=422, detail="Informe a prateleira para alterar a seção.")
    if requested_quantity is not None:
        copies = list(db.scalars(select(Exemplar).where(Exemplar.livro_id == livro.id).order_by(Exemplar.id)).all())
        borrowed_count = sum(copy.situacao == SituacaoExemplar.EMPRESTADO for copy in copies)
        if requested_quantity < borrowed_count:
            raise HTTPException(status_code=422, detail="A quantidade não pode ser menor que os exemplares emprestados.")
        if requested_quantity < len(copies):
            removable = [copy for copy in copies if copy.situacao == SituacaoExemplar.DISPONIVEL]
            for copy in removable[:len(copies) - requested_quantity]:
                db.delete(copy)
        elif requested_quantity > len(copies):
            shelf_id = prateleira_id or (copies[0].prateleira_id if copies else None)
            if shelf_id is None:
                shelf_id = _get_or_create_default_shelf(db).id
            base_code = livro.numero_registro or f"LIVRO-{livro.id}"
            existing_codes = {copy.codigo for copy in copies}
            next_index = len(copies) + 1
            while len(copies) < requested_quantity:
                code = f"{base_code}-{next_index:03d}"
                next_index += 1
                if code in existing_codes:
                    continue
                db.add(Exemplar(codigo=code, livro_id=livro.id, situacao=SituacaoExemplar.DISPONIVEL, prateleira_id=shelf_id, secao_id=secao_id if prateleira_id else (copies[0].secao_id if copies else None)))
                existing_codes.add(code)
                copies.append(None)
    for field, value in values.items():
        setattr(livro, field, value)
    try:
        db.commit()
    except IntegrityError as error:
        db.rollback()
        raise duplicate("Este número de registro já está sendo utilizado por outro livro.") from error
    db.refresh(livro)
    return livro


def clone_livro(db: Session, livro: Livro) -> Livro:
    first_copy = db.scalar(select(Exemplar).where(Exemplar.livro_id == livro.id).order_by(Exemplar.id))
    payload = LivroCreate(
        numero_registro=None,
        titulo=livro.titulo,
        tipo_obra=livro.tipo_obra,
        pi=livro.pi,
        cdd=livro.cdd,
        cutter=livro.cutter,
        assunto=livro.assunto,
        local=livro.local,
        volumes=livro.volumes,
        serie=livro.serie,
        observacoes=livro.observacoes,
        subtitulo=livro.subtitulo,
        autores=", ".join(author.nome for author in livro.autores),
        isbn=livro.isbn,
        editora=livro.editora.nome if livro.editora else None,
        editora_id=livro.editora_id,
        numero_exemplares=1,
        prateleira_id=first_copy.prateleira_id if first_copy else None,
        secao_id=first_copy.secao_id if first_copy else None,
        ano_publicacao=livro.ano_publicacao,
        edicao=livro.edicao,
        categoria_id=livro.categoria_id,
        idioma=livro.idioma,
        numero_paginas=livro.numero_paginas,
        descricao=livro.descricao,
    )
    return create_livro(db, payload)
