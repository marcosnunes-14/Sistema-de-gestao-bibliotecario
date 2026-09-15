from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.models.exemplar import SituacaoExemplar


class ExemplarCreate(BaseModel):
    codigo: str = Field(min_length=1, max_length=50)
    livro_id: int = Field(gt=0)
    situacao: SituacaoExemplar = SituacaoExemplar.DISPONIVEL
    estado_conservacao: str | None = Field(default=None, max_length=50)
    prateleira_id: int | None = Field(default=None, gt=0)
    secao_id: int | None = Field(default=None, gt=0)

    @field_validator("codigo")
    @classmethod
    def validar_codigo(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("código não pode ser vazio")
        return value.strip()


class ExemplarRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    codigo: str
    livro_id: int
    cadastrado_por_id: int | None = None
    situacao: SituacaoExemplar
    estado_conservacao: str | None
    data_cadastro: datetime
    situacao_alterada_em: datetime | None = None
    situacao_alterada_por_id: int | None = None
    prateleira_id: int | None = None
    secao_id: int | None = None


class ExemplarSituacaoUpdate(BaseModel):
    situacao: SituacaoExemplar


class ExemplarLocalizacaoUpdate(BaseModel):
    prateleira_id: int | None = Field(default=None, gt=0)
    secao_id: int | None = Field(default=None, gt=0)


class EmprestimoCreate(BaseModel):
    aluno_id: int | None = Field(default=None, gt=0)
    exemplar_id: int | None = Field(default=None, gt=0)
    nome_aluno: str | None = Field(default=None, min_length=1, max_length=200)
    serie_aluno: str | None = Field(default=None, min_length=1, max_length=50)
    codigo_livro: str | None = Field(default=None, min_length=1, max_length=50)
    nome_livro: str | None = Field(default=None, min_length=1, max_length=300)
    autor_livro: str | None = Field(default=None, min_length=1, max_length=200)
    data_emprestimo: datetime = Field(default_factory=datetime.now)
    data_entrega: datetime | None = Field(default=None)
    data_prevista_devolucao: datetime
    observacoes: str | None = Field(default=None, max_length=500)

    @model_validator(mode="after")
    def validar_prazo(self):
        entrega = self.data_entrega or self.data_emprestimo
        if self.data_prevista_devolucao <= entrega:
            raise ValueError("a data prevista deve ser posterior à data do empréstimo")
        is_manual = self.aluno_id is None and self.exemplar_id is None
        if is_manual:
            required = [self.nome_aluno, self.serie_aluno, self.codigo_livro, self.nome_livro, self.autor_livro]
            if any(value is None or not value.strip() for value in required):
                raise ValueError("para empréstimo manual, informe nome do aluno, série, código do livro, nome do livro e autor")
            return self
        if self.aluno_id is None or self.exemplar_id is None:
            raise ValueError("para empréstimo por cadastro existente, informe aluno_id e exemplar_id")
        return self


class DevolucaoCreate(BaseModel):
    data_devolucao: datetime = Field(default_factory=datetime.now)
    estado_conservacao: str | None = Field(default=None, max_length=50)


class RenovacaoCreate(BaseModel):
    nova_data_prevista_devolucao: datetime


class EmprestimoRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    aluno_id: int | None = None
    aluno_nome: str
    exemplar_id: int | None = None
    exemplar_codigo: str
    livro_id: int | None = None
    livro_titulo: str
    nome_aluno: str | None = None
    serie_aluno: str | None = None
    codigo_livro: str | None = None
    nome_livro: str | None = None
    autor_livro: str | None = None
    data_emprestimo: datetime
    data_entrega: datetime | None = None
    data_prevista_devolucao: datetime
    data_devolucao: datetime | None
    situacao: str
    observacoes: str | None
    realizado_por_id: int | None
    realizado_por_nome: str | None
    devolvido_por_id: int | None
    devolvido_por_nome: str | None


class RenovacaoRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    emprestimo_id: int
    data_anterior_devolucao: datetime
    nova_data_prevista_devolucao: datetime
    data_renovacao: datetime
