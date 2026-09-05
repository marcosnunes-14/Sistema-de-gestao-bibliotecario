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
    aluno_id: int = Field(gt=0)
    exemplar_id: int = Field(gt=0)
    data_emprestimo: datetime = Field(default_factory=datetime.now)
    data_prevista_devolucao: datetime
    observacoes: str | None = Field(default=None, max_length=500)

    @model_validator(mode="after")
    def validar_prazo(self):
        if self.data_prevista_devolucao <= self.data_emprestimo:
            raise ValueError("a data prevista deve ser posterior à data do empréstimo")
        return self


class DevolucaoCreate(BaseModel):
    data_devolucao: datetime = Field(default_factory=datetime.now)
    estado_conservacao: str | None = Field(default=None, max_length=50)


class RenovacaoCreate(BaseModel):
    nova_data_prevista_devolucao: datetime


class EmprestimoRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    aluno_id: int
    aluno_nome: str
    exemplar_id: int
    exemplar_codigo: str
    livro_id: int
    livro_titulo: str
    data_emprestimo: datetime
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
