from datetime import datetime

from fastapi import HTTPException, status
from sqlalchemy import and_, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session, joinedload, selectinload

from app.models.aluno import Aluno
from app.models.emprestimo import Emprestimo, Renovacao, SituacaoEmprestimo
from app.models.exemplar import Exemplar, SituacaoExemplar
from app.models.livro import Livro
from app.models.prateleira import Prateleira
from app.models.secao import Secao
from app.models.usuario import Usuario
from app.schemas.emprestimo import DevolucaoCreate, EmprestimoCreate, ExemplarCreate, RenovacaoCreate
from app.services.auditoria import registrar


def conflict(detail: str) -> HTTPException:
    return HTTPException(status_code=status.HTTP_409_CONFLICT, detail=detail)


def get_exemplar_or_404(db: Session, exemplar_id: int) -> Exemplar:
    exemplar = db.get(Exemplar, exemplar_id)
    if exemplar is None:
        raise HTTPException(status_code=404, detail="Exemplar não encontrado.")
    return exemplar


def create_exemplar(db: Session, data: ExemplarCreate, usuario: Usuario | None = None) -> Exemplar:
    if db.get(Livro, data.livro_id) is None:
        raise HTTPException(status_code=404, detail="Livro não encontrado.")
    if data.situacao == SituacaoExemplar.EMPRESTADO:
        raise HTTPException(status_code=422, detail="Um exemplar novo não pode ser criado como emprestado.")
    if data.prateleira_id is not None and db.get(Prateleira, data.prateleira_id) is None:
        raise HTTPException(status_code=404, detail="Prateleira não encontrada.")
    if data.secao_id is not None:
        secao = db.get(Secao, data.secao_id)
        if secao is None or (data.prateleira_id is not None and secao.prateleira_id != data.prateleira_id):
            raise HTTPException(status_code=422, detail="A seção não pertence à prateleira informada.")
    exemplar = Exemplar(**data.model_dump(), cadastrado_por_id=usuario.id if usuario else None)
    db.add(exemplar)
    try:
        db.commit()
    except IntegrityError as error:
        db.rollback()
        raise conflict("Já existe um exemplar com este código.") from error
    db.refresh(exemplar)
    return exemplar


def list_exemplares(
    db: Session,
    livro_id: int | None = None,
    page: int = 1,
    page_size: int = 50,
) -> list[Exemplar]:
    query = select(Exemplar).order_by(Exemplar.codigo)
    if livro_id is not None:
        query = query.where(Exemplar.livro_id == livro_id)
    return list(db.scalars(query.offset((page - 1) * page_size).limit(page_size)).all())


def update_exemplar_situacao(db: Session, exemplar: Exemplar, situacao: SituacaoExemplar, usuario: Usuario) -> Exemplar:
    if exemplar.situacao == SituacaoExemplar.EMPRESTADO:
        raise conflict("Um exemplar emprestado só pode mudar de situação após a devolução.")
    if situacao == SituacaoExemplar.EMPRESTADO:
        raise conflict("A situação emprestado é controlada pelo fluxo de empréstimo.")
    if exemplar.situacao == situacao:
        return exemplar
    anterior = exemplar.situacao.value
    exemplar.situacao = situacao
    exemplar.situacao_alterada_em = datetime.now()
    exemplar.situacao_alterada_por_id = usuario.id
    registrar(db, "alterar_situacao", "exemplar", exemplar.id, usuario, {"de": anterior, "para": situacao.value})
    db.commit()
    db.refresh(exemplar)
    return exemplar


def update_exemplar_localizacao(db: Session, exemplar: Exemplar, prateleira_id: int | None, secao_id: int | None) -> Exemplar:
    if prateleira_id is not None and db.get(Prateleira, prateleira_id) is None:
        raise HTTPException(status_code=404, detail="Prateleira não encontrada.")
    if secao_id is not None:
        secao = db.get(Secao, secao_id)
        if secao is None or secao.prateleira_id != prateleira_id:
            raise HTTPException(status_code=422, detail="A seção não pertence à prateleira informada.")
    exemplar.prateleira_id = prateleira_id
    exemplar.secao_id = secao_id
    db.commit()
    db.refresh(exemplar)
    return exemplar


def get_aluno_or_404(db: Session, aluno_id: int) -> Aluno:
    aluno = db.get(Aluno, aluno_id)
    if aluno is None:
        raise HTTPException(status_code=404, detail="Aluno não encontrado.")
    return aluno


def _loan_query():
    return select(Emprestimo).options(
        joinedload(Emprestimo.aluno),
        joinedload(Emprestimo.exemplar).joinedload(Exemplar.livro),
    )


def create_emprestimo(db: Session, data: EmprestimoCreate, usuario: Usuario | None = None) -> Emprestimo:
    aluno = get_aluno_or_404(db, data.aluno_id)
    if not aluno.ativo:
        raise conflict("Aluno inativo não pode realizar empréstimos.")
    exemplar = get_exemplar_or_404(db, data.exemplar_id)
    if exemplar.situacao != SituacaoExemplar.DISPONIVEL:
        raise conflict("O exemplar não está disponível para empréstimo.")
    active_loan = db.scalar(
        select(Emprestimo).where(
            Emprestimo.exemplar_id == exemplar.id,
            Emprestimo.situacao_base == SituacaoEmprestimo.ATIVO,
        )
    )
    if active_loan is not None:
        raise conflict("O exemplar já está emprestado.")
    emprestimo = Emprestimo(
        **data.model_dump(),
        realizado_por_id=usuario.id if usuario else None,
    )
    exemplar.situacao = SituacaoExemplar.EMPRESTADO
    db.add(emprestimo)
    registrar(db, "criar", "emprestimo", None, usuario, {"exemplar_id": exemplar.id, "aluno_id": aluno.id})
    try:
        db.commit()
    except IntegrityError as error:
        db.rollback()
        raise conflict("O exemplar já possui um empréstimo ativo.") from error
    db.refresh(emprestimo)
    return db.scalar(_loan_query().where(Emprestimo.id == emprestimo.id))


def list_emprestimos(
    db: Session,
    situacao: str | None = None,
    aluno: str | None = None,
    matricula: str | None = None,
    exemplar: str | None = None,
    titulo: str | None = None,
    page: int = 1,
    page_size: int = 50,
) -> list[Emprestimo]:
    query = _loan_query().join(Emprestimo.aluno).join(Emprestimo.exemplar).join(Exemplar.livro)
    filters = []
    now = datetime.now()
    if situacao == "ativo":
        filters.append(Emprestimo.situacao_base == SituacaoEmprestimo.ATIVO)
        filters.append(Emprestimo.data_prevista_devolucao >= now)
    elif situacao == "atrasado":
        filters.append(Emprestimo.situacao_base == SituacaoEmprestimo.ATIVO)
        filters.append(Emprestimo.data_prevista_devolucao < now)
    elif situacao == "devolvido":
        filters.append(Emprestimo.situacao_base == SituacaoEmprestimo.DEVOLVIDO)
    elif situacao == "cancelado":
        filters.append(Emprestimo.situacao_base == SituacaoEmprestimo.CANCELADO)
    elif situacao:
        raise HTTPException(status_code=422, detail="Situação de empréstimo inválida.")
    if aluno:
        filters.append(Aluno.nome_completo.ilike(f"%{aluno.strip()}%"))
    if matricula:
        filters.append(Aluno.matricula.ilike(f"%{matricula.strip()}%"))
    if exemplar:
        filters.append(Exemplar.codigo.ilike(f"%{exemplar.strip()}%"))
    if titulo:
        filters.append(Livro.titulo.ilike(f"%{titulo.strip()}%"))
    if filters:
        query = query.where(and_(*filters))
    query = query.order_by(Emprestimo.data_emprestimo.desc())
    return list(
        db.scalars(query.offset((page - 1) * page_size).limit(page_size)).unique().all()
    )


def get_emprestimo_or_404(db: Session, emprestimo_id: int) -> Emprestimo:
    emprestimo = db.scalar(_loan_query().where(Emprestimo.id == emprestimo_id))
    if emprestimo is None:
        raise HTTPException(status_code=404, detail="Empréstimo não encontrado.")
    return emprestimo


def devolver_emprestimo(
    db: Session,
    emprestimo: Emprestimo,
    data: DevolucaoCreate,
    usuario: Usuario | None = None,
) -> Emprestimo:
    if emprestimo.situacao_base != SituacaoEmprestimo.ATIVO:
        raise conflict("Este empréstimo não está ativo e não pode ser devolvido novamente.")
    if data.data_devolucao < emprestimo.data_emprestimo:
        raise HTTPException(status_code=422, detail="A devolução não pode ser anterior ao empréstimo.")
    emprestimo.data_devolucao = data.data_devolucao
    emprestimo.devolvido_por_id = usuario.id if usuario else None
    emprestimo.situacao_base = SituacaoEmprestimo.DEVOLVIDO
    if data.estado_conservacao is not None:
        emprestimo.exemplar.estado_conservacao = data.estado_conservacao
    if (data.estado_conservacao or "").strip().lower() == "danificado":
        emprestimo.exemplar.situacao = SituacaoExemplar.MANUTENCAO
    else:
        emprestimo.exemplar.situacao = SituacaoExemplar.DISPONIVEL
    registrar(db, "devolver", "emprestimo", emprestimo.id, usuario, {"exemplar_id": emprestimo.exemplar_id})
    try:
        db.commit()
    except SQLAlchemyError as error:
        db.rollback()
        raise conflict("Não foi possível registrar a devolução.") from error
    db.refresh(emprestimo)
    return get_emprestimo_or_404(db, emprestimo.id)


def renovar_emprestimo(db: Session, emprestimo: Emprestimo, data: RenovacaoCreate) -> Emprestimo:
    if emprestimo.situacao_base != SituacaoEmprestimo.ATIVO:
        raise conflict("Apenas empréstimos ativos podem ser renovados.")
    if data.nova_data_prevista_devolucao <= datetime.now():
        raise HTTPException(status_code=422, detail="A nova data prevista deve estar no futuro.")
    renovacao = Renovacao(
        emprestimo_id=emprestimo.id,
        data_anterior_devolucao=emprestimo.data_prevista_devolucao,
        nova_data_prevista_devolucao=data.nova_data_prevista_devolucao,
        data_renovacao=datetime.now(),
    )
    emprestimo.data_prevista_devolucao = data.nova_data_prevista_devolucao
    db.add(renovacao)
    try:
        db.commit()
    except SQLAlchemyError as error:
        db.rollback()
        raise conflict("Não foi possível registrar a renovação.") from error
    db.refresh(emprestimo)
    return get_emprestimo_or_404(db, emprestimo.id)


def cancelar_emprestimo(db: Session, emprestimo: Emprestimo) -> Emprestimo:
    if emprestimo.situacao_base != SituacaoEmprestimo.ATIVO or emprestimo.data_devolucao is not None:
        raise conflict("Somente um empréstimo ativo sem devolução pode ser cancelado.")
    emprestimo.situacao_base = SituacaoEmprestimo.CANCELADO
    emprestimo.exemplar.situacao = SituacaoExemplar.DISPONIVEL
    try:
        db.commit()
    except SQLAlchemyError as error:
        db.rollback()
        raise conflict("Não foi possível cancelar o empréstimo.") from error
    db.refresh(emprestimo)
    return get_emprestimo_or_404(db, emprestimo.id)


def historico_aluno(db: Session, aluno_id: int) -> list[Emprestimo]:
    get_aluno_or_404(db, aluno_id)
    return list(
        db.scalars(_loan_query().where(Emprestimo.aluno_id == aluno_id).order_by(Emprestimo.data_emprestimo.desc())).unique().all()
    )


def historico_exemplar(db: Session, exemplar_id: int) -> list[Emprestimo]:
    get_exemplar_or_404(db, exemplar_id)
    return list(
        db.scalars(_loan_query().where(Emprestimo.exemplar_id == exemplar_id).order_by(Emprestimo.data_emprestimo.desc())).unique().all()
    )


def historico_livro(db: Session, livro_id: int) -> list[Emprestimo]:
    if db.get(Livro, livro_id) is None:
        raise HTTPException(status_code=404, detail="Livro não encontrado.")
    query = _loan_query().join(Emprestimo.exemplar).where(Exemplar.livro_id == livro_id)
    return list(db.scalars(query.order_by(Emprestimo.data_emprestimo.desc())).unique().all())
