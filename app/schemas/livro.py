from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


def normalize_isbn(value: str | None) -> str | None:
    if value is None or not value.strip():
        return None
    normalized = "".join(character for character in value if character.isdigit() or character in "Xx")
    if len(normalized) == 10:
        digits = [10 if character in "Xx" else int(character) for character in normalized]
        if sum(digit * (10 - index) for index, digit in enumerate(digits)) % 11 != 0:
            raise ValueError("ISBN-10 inválido")
    elif len(normalized) == 13:
        digits = [int(character) for character in normalized]
        if sum(digit * (1 if index % 2 == 0 else 3) for index, digit in enumerate(digits)) % 10 != 0:
            raise ValueError("ISBN-13 inválido")
    else:
        raise ValueError("ISBN deve possuir 10 ou 13 dígitos")
    return normalized.upper()


class AutorCreate(BaseModel):
    nome: str = Field(min_length=1, max_length=200)

    @field_validator("nome")
    @classmethod
    def validar_nome(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("nome não pode ser vazio")
        return value.strip()


class AutorUpdate(BaseModel):
    nome: str = Field(min_length=1, max_length=200)

    @field_validator("nome")
    @classmethod
    def validar_nome(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("nome não pode ser vazio")
        return value.strip()


class AutorRead(AutorCreate):
    model_config = ConfigDict(from_attributes=True)

    id: int
    ativo: bool


class EditoraCreate(BaseModel):
    nome: str = Field(min_length=1, max_length=200)

    @field_validator("nome")
    @classmethod
    def validar_nome(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("nome não pode ser vazio")
        return value.strip()


class EditoraUpdate(EditoraCreate):
    pass


class EditoraRead(EditoraCreate):
    model_config = ConfigDict(from_attributes=True)

    id: int
    ativo: bool


class LivroBase(BaseModel):
    numero_registro: str | None = Field(default=None, max_length=50)
    titulo: str = Field(min_length=1, max_length=300)
    tipo_obra: str | None = Field(default=None, max_length=100)
    pi: str | None = Field(default=None, max_length=100)
    cdd: str | None = Field(default=None, max_length=50)
    cutter: str | None = Field(default=None, max_length=50)
    assunto: str | None = None
    local: str | None = Field(default=None, max_length=200)
    volumes: int | None = Field(default=None, gt=0)
    serie: str | None = Field(default=None, max_length=200)
    observacoes: str | None = None
    subtitulo: str | None = Field(default=None, max_length=300)
    autor_ids: list[int] | None = Field(default=None, min_length=1)
    autores: str | None = Field(default=None, max_length=1000)
    editora: str | None = Field(default=None, max_length=200)
    numero_exemplares: int = Field(default=0, ge=0)
    prateleira_id: int | None = Field(default=None, gt=0)
    secao_id: int | None = Field(default=None, gt=0)
    isbn: str | None = None
    editora_id: int | None = Field(default=None, gt=0)
    ano_publicacao: int | None = Field(default=None, ge=1000, le=2100)
    edicao: str | None = Field(default=None, max_length=50)
    categoria_id: int | None = Field(default=None, gt=0)
    idioma: str = Field(default="Português", min_length=1, max_length=50)
    numero_paginas: int | None = Field(default=None, gt=0)
    descricao: str | None = None

    @field_validator("titulo", "idioma")
    @classmethod
    def validar_texto_obrigatorio(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("não pode ser vazio")
        return value.strip()

    @field_validator("numero_registro", "tipo_obra", "pi", "cdd", "cutter", "local", "serie", "autores", "editora")
    @classmethod
    def limpar_texto_opcional(cls, value: str | None) -> str | None:
        return value.strip() if value is not None and value.strip() else None

    @model_validator(mode="after")
    def validar_autores_informados(self):
        if not self.autor_ids and not self.autores:
            raise ValueError("informe ao menos um autor")
        return self

    @field_validator("isbn")
    @classmethod
    def validar_isbn(cls, value: str | None) -> str | None:
        return normalize_isbn(value)

    @field_validator("autor_ids")
    @classmethod
    def validar_autores(cls, value: list[int]) -> list[int]:
        if value and (any(author_id <= 0 for author_id in value) or len(set(value)) != len(value)):
            raise ValueError("informe ao menos um autor válido e sem duplicidade")
        return value


class LivroCreate(LivroBase):
    pass


class LivroUpdate(BaseModel):
    numero_registro: str | None = Field(default=None, max_length=50)
    titulo: str | None = Field(default=None, min_length=1, max_length=300)
    tipo_obra: str | None = Field(default=None, max_length=100)
    pi: str | None = Field(default=None, max_length=100)
    cdd: str | None = Field(default=None, max_length=50)
    cutter: str | None = Field(default=None, max_length=50)
    assunto: str | None = None
    local: str | None = Field(default=None, max_length=200)
    volumes: int | None = Field(default=None, gt=0)
    serie: str | None = Field(default=None, max_length=200)
    observacoes: str | None = None
    subtitulo: str | None = Field(default=None, max_length=300)
    autor_ids: list[int] | None = Field(default=None, min_length=1)
    autores: str | None = Field(default=None, max_length=1000)
    editora: str | None = Field(default=None, max_length=200)
    isbn: str | None = None
    editora_id: int | None = Field(default=None, gt=0)
    ano_publicacao: int | None = Field(default=None, ge=1000, le=2100)
    edicao: str | None = Field(default=None, max_length=50)
    categoria_id: int | None = Field(default=None, gt=0)
    idioma: str | None = Field(default=None, min_length=1, max_length=50)
    numero_paginas: int | None = Field(default=None, gt=0)
    descricao: str | None = None

    @field_validator("titulo", "idioma", "numero_registro", "tipo_obra", "pi", "cdd", "cutter", "local", "serie", "autores", "editora")
    @classmethod
    def validar_texto(cls, value: str | None) -> str | None:
        if value is not None and not value.strip():
            raise ValueError("não pode ser vazio")
        return value.strip() if value is not None else None

    @field_validator("isbn")
    @classmethod
    def validar_isbn(cls, value: str | None) -> str | None:
        return normalize_isbn(value)


class LivroStatusUpdate(BaseModel):
    ativo: bool


class LivroISBNRead(BaseModel):
    isbn: str | None = None
    titulo: str | None = None
    subtitulo: str | None = None
    autores: list[str] = Field(default_factory=list)
    editora: str | None = None
    data_publicacao: str | None = None
    ano_publicacao: int | None = None
    descricao: str | None = None
    numero_paginas: int | None = None
    idioma: str | None = None
    categorias: list[str] = Field(default_factory=list)
    capa_url: str | None = None


class LivroRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    numero_registro: str | None
    titulo: str
    tipo_obra: str | None
    pi: str | None
    cdd: str | None
    cutter: str | None
    assunto: str | None
    local: str | None
    volumes: int | None
    serie: str | None
    observacoes: str | None
    subtitulo: str | None
    isbn: str | None
    editora_id: int | None
    ano_publicacao: int | None
    edicao: str | None
    categoria_id: int | None
    idioma: str
    numero_paginas: int | None
    descricao: str | None
    ativo: bool
    data_cadastro: datetime
    data_atualizacao: datetime
    autores: list[AutorRead]
