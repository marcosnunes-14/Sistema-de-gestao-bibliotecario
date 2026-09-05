from sqlalchemy import case, func, select
from sqlalchemy.orm import Session

from app.models.exemplar import Exemplar, SituacaoExemplar
from app.models.livro import Livro
from app.models.prateleira import Prateleira
from app.models.secao import Secao
from app.schemas.estoque import EstoqueAgregadoRead


def list_estoque_agregado(
    db: Session,
    page: int = 1,
    page_size: int = 50,
    search: str | None = None,
    categoria_id: int | None = None,
    situacao: str | None = None,
    prateleira_id: int | None = None,
    secao_id: int | None = None,
    finalidade: str | None = None,
    genero: str | None = None,
) -> list[EstoqueAgregadoRead]:
    counts = {
        key: func.sum(case((Exemplar.situacao == value, 1), else_=0)).label(key)
        for key, value in {
            "disponiveis": SituacaoExemplar.DISPONIVEL,
            "emprestados": SituacaoExemplar.EMPRESTADO,
            "manutencao": SituacaoExemplar.MANUTENCAO,
            "baixados": SituacaoExemplar.BAIXADO,
            "perdidos": SituacaoExemplar.PERDIDO,
        }.items()
    }
    query = select(
        Livro.id.label("livro_id"), Livro.titulo, Livro.categoria_id,
        func.count(Exemplar.id).label("total"), *counts.values(),
    ).outerjoin(Exemplar, Exemplar.livro_id == Livro.id).outerjoin(Prateleira, Exemplar.prateleira_id == Prateleira.id).outerjoin(Secao, Exemplar.secao_id == Secao.id).group_by(Livro.id).order_by(Livro.titulo)
    if search:
        query = query.where(Livro.titulo.ilike(f"%{search.strip()}%"))
    if categoria_id is not None:
        query = query.where(Livro.categoria_id == categoria_id)
    if prateleira_id is not None:
        query = query.where(Exemplar.prateleira_id == prateleira_id)
    if secao_id is not None:
        query = query.where(Exemplar.secao_id == secao_id)
    if finalidade:
        query = query.where(Prateleira.finalidade.ilike(f"%{finalidade.strip()}%"))
    if genero:
        query = query.where(Prateleira.genero_principal.ilike(f"%{genero.strip()}%"))
    if situacao:
        if situacao not in {item.value for item in SituacaoExemplar}:
            raise ValueError("Situação de exemplar inválida.")
        query = query.having(func.sum(case((Exemplar.situacao == situacao, 1), else_=0)) > 0)
    rows = db.execute(query.offset((page - 1) * page_size).limit(page_size)).mappings()
    result = []
    for row in rows:
        locations = db.execute(select(Prateleira.numero, Secao.numero).join(Exemplar, Exemplar.prateleira_id == Prateleira.id).outerjoin(Secao, Exemplar.secao_id == Secao.id).where(Exemplar.livro_id == row["livro_id"]).distinct()).all()
        location_names = [f"Prateleira {shelf:02d}" + (f" · Seção {chr(64 + section)}" if section else "") for shelf, section in locations]
        result.append(EstoqueAgregadoRead(**{key: (row[key] or 0) for key in ("livro_id", "titulo", "categoria_id", "total", *counts)}, localizacoes=location_names))
    return result
