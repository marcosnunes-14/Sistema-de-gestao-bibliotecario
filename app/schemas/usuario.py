from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.usuario import PerfilUsuario


class LoginRequest(BaseModel):
    username: str = Field(min_length=1)
    senha: str = Field(min_length=8)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UsuarioCreate(BaseModel):
    nome: str = Field(min_length=1, max_length=200)
    username: str = Field(min_length=3, max_length=80)
    senha: str = Field(min_length=8, max_length=128)
    perfil: PerfilUsuario = PerfilUsuario.BIBLIOTECARIO

    @field_validator("nome", "username")
    @classmethod
    def validar_texto(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("não pode ser vazio")
        return value.strip()

    @field_validator("senha")
    @classmethod
    def validar_senha(cls, value: str) -> str:
        if not any(character.isalpha() for character in value) or not any(character.isdigit() for character in value):
            raise ValueError("a senha deve conter pelo menos uma letra e um número")
        return value


class UsuarioUpdate(BaseModel):
    nome: str | None = Field(default=None, min_length=1, max_length=200)
    perfil: PerfilUsuario | None = None

    @field_validator("nome")
    @classmethod
    def validar_nome(cls, value: str | None) -> str | None:
        if value is not None and not value.strip():
            raise ValueError("nome não pode ser vazio")
        return value.strip() if value is not None else None


class SenhaUpdate(BaseModel):
    senha_atual: str = Field(min_length=1)
    nova_senha: str = Field(min_length=8, max_length=128)

    @field_validator("nova_senha")
    @classmethod
    def validar_nova_senha(cls, value: str) -> str:
        if not any(character.isalpha() for character in value) or not any(character.isdigit() for character in value):
            raise ValueError("a senha deve conter pelo menos uma letra e um número")
        return value


class SenhaAdminUpdate(BaseModel):
    nova_senha: str = Field(min_length=8, max_length=128)

    @field_validator("nova_senha")
    @classmethod
    def validar_nova_senha(cls, value: str) -> str:
        if not any(character.isalpha() for character in value) or not any(character.isdigit() for character in value):
            raise ValueError("a senha deve conter pelo menos uma letra e um número")
        return value


class StatusUsuarioUpdate(BaseModel):
    ativo: bool


class UsuarioRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nome: str
    username: str
    perfil: PerfilUsuario
    ativo: bool
    data_criacao: datetime
    data_atualizacao: datetime
    ultimo_login: datetime | None
