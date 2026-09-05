from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator


class CategoriaCreate(BaseModel):
    nome: str = Field(min_length=1, max_length=100)
    descricao: str | None = None

    @field_validator("nome")
    @classmethod
    def validar_nome(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("nome não pode ser vazio")
        return value.strip()


class CategoriaRead(CategoriaCreate):
    model_config = ConfigDict(from_attributes=True)

    id: int
    ativo: bool


class CategoriaUpdate(BaseModel):
    nome: str | None = Field(default=None, min_length=1, max_length=100)
    descricao: str | None = None

    @field_validator("nome")
    @classmethod
    def validar_nome(cls, value: str | None) -> str | None:
        if value is not None and not value.strip():
            raise ValueError("nome não pode ser vazio")
        return value.strip() if value is not None else None


class CategoriaStatusUpdate(BaseModel):
    ativo: bool


class PrateleiraCreate(BaseModel):
    numero: int = Field(gt=0, le=12)
    descricao: str | None = Field(default=None, max_length=200)
    finalidade: str | None = Field(default=None, max_length=100)
    genero_principal: str | None = Field(default=None, max_length=150)
    observacoes: str | None = None


class PrateleiraUpdate(BaseModel):
    numero: int | None = Field(default=None, gt=0, le=12)
    descricao: str | None = Field(default=None, max_length=200)
    finalidade: str | None = Field(default=None, max_length=100)
    genero_principal: str | None = Field(default=None, max_length=150)
    observacoes: str | None = None


class PrateleiraStatusUpdate(BaseModel):
    ativa: bool


class PrateleiraRead(PrateleiraCreate):
    model_config = ConfigDict(from_attributes=True)

    id: int
    ativa: bool
    data_criacao: datetime
    data_atualizacao: datetime


class SecaoCreate(BaseModel):
    numero: int = Field(gt=0)
    categoria_id: int | None = Field(default=None, gt=0)
    descricao: str | None = Field(default=None, max_length=200)


class SecaoUpdate(BaseModel):
    prateleira_id: int | None = Field(default=None, gt=0)
    numero: int | None = Field(default=None, gt=0)
    categoria_id: int | None = Field(default=None, gt=0)
    descricao: str | None = Field(default=None, max_length=200)


class SecaoStatusUpdate(BaseModel):
    ativa: bool


class SecaoRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    prateleira_id: int
    numero: int
    codigo_localizacao: str
    categoria_id: int | None
    descricao: str | None
    ativa: bool
