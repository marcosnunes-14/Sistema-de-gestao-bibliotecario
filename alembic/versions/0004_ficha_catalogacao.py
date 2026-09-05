"""Add catalog card fields to books."""

from alembic import op
import sqlalchemy as sa


revision = "0004_ficha_catalogacao"
down_revision = "0003_auditoria_situacao_exemplares"
branch_labels = None
depends_on = None


def upgrade() -> None:
    columns = {
        "numero_registro": sa.String(length=50),
        "tipo_obra": sa.String(length=100),
        "pi": sa.String(length=100),
        "cdd": sa.String(length=50),
        "cutter": sa.String(length=50),
        "assunto": sa.Text(),
        "local": sa.String(length=200),
        "volumes": sa.Integer(),
        "serie": sa.String(length=200),
        "observacoes": sa.Text(),
    }
    inspector = sa.inspect(op.get_bind())
    existing = {column["name"] for column in inspector.get_columns("livros")}
    with op.batch_alter_table("livros") as batch:
        for name, column in columns.items():
            if name not in existing:
                batch.add_column(sa.Column(name, column, nullable=True))
        if "numero_registro" not in {index["name"] for index in inspector.get_indexes("livros")}:
            batch.create_index("ix_livros_numero_registro", ["numero_registro"], unique=True)


def downgrade() -> None:
    with op.batch_alter_table("livros") as batch:
        batch.drop_index("ix_livros_numero_registro")
        for name in ["observacoes", "serie", "volumes", "local", "assunto", "cutter", "cdd", "pi", "tipo_obra", "numero_registro"]:
            batch.drop_column(name)