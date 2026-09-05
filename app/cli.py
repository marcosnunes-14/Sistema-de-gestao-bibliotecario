import argparse
from getpass import getpass

from sqlalchemy import select

from app.db.session import SessionLocal, create_database
from app.models.usuario import PerfilUsuario, Usuario
from app.core.security import hash_password


def create_admin() -> None:
    nome = input("Nome do administrador: ").strip()
    username = input("Login: ").strip()
    senha = getpass("Senha (mínimo 8 caracteres, com letra e número): ")
    confirmacao = getpass("Confirme a senha: ")
    if senha != confirmacao:
        raise SystemExit("As senhas não conferem.")
    if len(senha) < 8 or not any(char.isalpha() for char in senha) or not any(char.isdigit() for char in senha):
        raise SystemExit("A senha precisa ter pelo menos 8 caracteres, uma letra e um número.")

    db = SessionLocal()
    try:
        if db.scalar(select(Usuario).where(Usuario.username == username)):
            raise SystemExit("Já existe um usuário com este login.")
        db.add(Usuario(nome=nome, username=username, senha_hash=hash_password(senha), perfil=PerfilUsuario.ADMINISTRADOR))
        db.commit()
        print("Administrador criado com sucesso.")
    finally:
        db.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Comandos administrativos da biblioteca")
    parser.add_argument("command", choices=["create-admin"])
    args = parser.parse_args()
    create_database()
    if args.command == "create-admin":
        create_admin()
