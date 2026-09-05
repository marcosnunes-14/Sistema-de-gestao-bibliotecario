from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.db.session import create_database
from app.core.config import CORS_ORIGINS


@asynccontextmanager
async def lifespan(_: FastAPI):
    create_database()
    yield


app = FastAPI(
    title="Sistema de Biblioteca Escolar",
    version="0.1.0",
    description="Base administrativa para a biblioteca escolar.",
    lifespan=lifespan,
    openapi_tags=[
        {"name": "Autenticação", "description": "Login e identidade do usuário atual."},
        {"name": "Usuários", "description": "Gerenciamento administrativo de usuários."},
        {"name": "Auditoria", "description": "Registro administrativo de operações."},
        {"name": "Alunos", "description": "Cadastro e consulta de alunos."},
        {"name": "Livros", "description": "Catálogo de obras."},
        {"name": "Estoque", "description": "Exemplares e localização física."},
        {"name": "Empréstimos", "description": "Circulação, devolução e históricos."},
    ],
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept"],
)

app.include_router(api_router, prefix="/api")


@app.get("/health", tags=["Sistema"])
def health_check() -> dict[str, str]:
    return {"status": "ok"}
