import argparse
from getpass import getpass
from pathlib import Path

from sqlalchemy import func, inspect, select

from app.db.session import SessionLocal, create_database, engine
from app.models import Exemplar, Livro, Prateleira
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


def diagnose() -> None:
    """Read the deployed database without creating users or changing its schema."""
    print(f"Tipo do banco: {engine.dialect.name}")
    if engine.dialect.name == "sqlite":
        database = engine.url.database
        if database and database != ":memory:":
            print(f"Arquivo SQLite: {database}")
            if not Path(database).exists():
                raise SystemExit("O arquivo configurado não existe. Confira DATABASE_URL; nenhum banco foi criado.")
    tables = set(inspect(engine).get_table_names())
    with SessionLocal() as db:
        for model in (Usuario, Livro, Exemplar, Prateleira):
            if model.__tablename__ in tables:
                total = db.scalar(select(func.count()).select_from(model))
                print(f"{model.__tablename__}: {total}")
            else:
                print(f"{model.__tablename__}: tabela ausente")
        if "usuarios" in tables:
            users = db.execute(select(Usuario.id, Usuario.username, Usuario.nome, Usuario.perfil, Usuario.ativo).order_by(Usuario.id))
            for user in users:
                print(f"ID {user.id} | Login: {user.username} | Nome: {user.nome} | Perfil: {user.perfil.value} | {'Ativo' if user.ativo else 'Inativo'}")


def reset_password(username: str) -> None:
    """Recover an existing account from the administrator's server shell."""
    with SessionLocal() as db:
        user = db.scalar(select(Usuario).where(Usuario.username == username))
        if user is None:
            raise SystemExit("Usuário não encontrado nesse banco. Execute diagnose e confira o login e DATABASE_URL.")
        if not user.ativo:
            raise SystemExit("Usuário inativo. A redefinição de senha não reativa a conta.")
        senha = getpass("Nova senha (mínimo 8 caracteres, com letra e número): ")
        confirmacao = getpass("Confirme a nova senha: ")
        if senha != confirmacao:
            raise SystemExit("As senhas não conferem. Nenhuma alteração foi feita.")
        if len(senha) < 8 or len(senha) > 128 or not any(char.isalpha() for char in senha) or not any(char.isdigit() for char in senha):
            raise SystemExit("A senha precisa ter entre 8 e 128 caracteres, uma letra e um número.")
        user.senha_hash = hash_password(senha)
        db.commit()
        print("Senha do usuário existente atualizada. O acervo foi preservado.")


def main() -> None:
    parser = argparse.ArgumentParser(description="Comandos administrativos da biblioteca")
    parser.add_argument("command", choices=["create-admin", "diagnose", "reset-password"])
    parser.add_argument("username", nargs="?", help="Login existente para reset-password")
    args = parser.parse_args()
    if args.command == "create-admin":
        create_database()
        create_admin()
    elif args.command == "diagnose":
        diagnose()
    else:
        if not args.username:
            parser.error("Informe o login: python -m app.cli reset-password LOGIN")
        reset_password(args.username)


if __name__ == "__main__":
    main()
