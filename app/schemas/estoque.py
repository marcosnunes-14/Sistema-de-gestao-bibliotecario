from pydantic import BaseModel, Field


class EstoqueAgregadoRead(BaseModel):
    livro_id: int
    titulo: str
    categoria_id: int | None
    total: int
    disponiveis: int
    emprestados: int
    manutencao: int
    baixados: int
    perdidos: int
    localizacoes: list[str] = Field(default_factory=list)
