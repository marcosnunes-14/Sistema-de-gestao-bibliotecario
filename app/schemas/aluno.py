from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator


class AlunoBase(BaseModel):
    nome_completo: str = Field(min_length=1, max_length=200)
    matricula: str = Field(min_length=1, max_length=50)
    turma: str = Field(min_length=1, max_length=50)
    serie_ano: str = Field(min_length=1, max_length=50)
    turno: str = Field(min_length=1, max_length=30)
    telefone: str | None = Field(default=None, max_length=30)
    nome_responsavel: str | None = Field(default=None, max_length=200)
    telefone_responsavel: str | None = Field(default=None, max_length=30)

    @field_validator(
        "nome_completo",
        "matricula",
        "turma",
        "serie_ano",
        "turno",
        mode="before",
    )
    @classmethod
    def reject_blank_required_fields(cls, value: str) -> str:
        if not isinstance(value, str) or not value.strip():
            raise ValueError("não pode ser vazio")
        return value.strip()


class AlunoCreate(AlunoBase):
    pass


class AlunoUpdate(BaseModel):
    nome_completo: str | None = Field(default=None, min_length=1, max_length=200)
    matricula: str | None = Field(default=None, min_length=1, max_length=50)
    turma: str | None = Field(default=None, min_length=1, max_length=50)
    serie_ano: str | None = Field(default=None, min_length=1, max_length=50)
    turno: str | None = Field(default=None, min_length=1, max_length=30)
    telefone: str | None = Field(default=None, max_length=30)
    nome_responsavel: str | None = Field(default=None, max_length=200)
    telefone_responsavel: str | None = Field(default=None, max_length=30)

    @field_validator("nome_completo", "matricula", "turma", "serie_ano", "turno")
    @classmethod
    def reject_blank_updated_fields(cls, value: str | None) -> str | None:
        if value is not None and not value.strip():
            raise ValueError("não pode ser vazio")
        return value.strip() if value is not None else None


class AlunoStatusUpdate(BaseModel):
    ativo: bool


class AlunoRead(AlunoBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    ativo: bool
    data_cadastro: datetime
    data_atualizacao: datetime
