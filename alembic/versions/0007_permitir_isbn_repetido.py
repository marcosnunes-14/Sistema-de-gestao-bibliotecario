"""Allow multiple catalog records to share an ISBN."""

from alembic import op
import sqlalchemy as sa


revision = "0007_permitir_isbn_repetido"
down_revision = "0006_obrigar_localizacao_exemplares"
branch_labels = None
depends_on = None


def upgrade() -> None:
    connection = op.get_bind()
    inspector = sa.inspect(connection)
    for index in inspector.get_indexes("livros"):
        if index.get("unique") and index.get("column_names") == ["isbn"]:
            op.drop_index(index["name"], table_name="livros")


def downgrade() -> None:
    op.create_index("uq_livros_isbn", "livros", ["isbn"], unique=True)