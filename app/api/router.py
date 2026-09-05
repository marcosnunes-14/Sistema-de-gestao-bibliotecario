from fastapi import APIRouter, Depends

from app.api.routes import auth, alunos, auditoria, cadastro, emprestimos, estoque, livros, usuarios
from app.core.security import get_current_user

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["Autenticação"])
api_router.include_router(usuarios.router, prefix="/usuarios", tags=["Usuários"])
api_router.include_router(auditoria.router, prefix="/auditoria", tags=["Auditoria"])
protected = {"dependencies": [Depends(get_current_user)]}
api_router.include_router(cadastro.router, prefix="/cadastro", tags=["Cadastro/Registro"], **protected)
api_router.include_router(alunos.router, prefix="/alunos", tags=["Alunos"], **protected)
api_router.include_router(livros.router, prefix="/livros", tags=["Livros"], **protected)
api_router.include_router(estoque.router, prefix="/estoque", tags=["Estoque"], **protected)
api_router.include_router(emprestimos.router, prefix="/emprestimos", tags=["Empréstimos"], **protected)
