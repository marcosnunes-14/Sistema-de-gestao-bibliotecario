"""Add shelf and section location to physical copies."""

from alembic import op
import sqlalchemy as sa


revision = "0005_localizacao_exemplares"
down_revision = "0004_ficha_catalogacao"
branch_labels = None
depends_on = None


def upgrade() -> None:
    connection = op.get_bind()
    inspector = sa.inspect(connection)
    exemplar_columns = {column["name"] for column in inspector.get_columns("exemplares")}
    shelf_columns = {column["name"] for column in inspector.get_columns("prateleiras")}
    with op.batch_alter_table("exemplares") as batch:
        if "prateleira_id" not in exemplar_columns:
            batch.add_column(sa.Column("prateleira_id", sa.Integer(), nullable=True))
        if "secao_id" not in exemplar_columns:
            batch.add_column(sa.Column("secao_id", sa.Integer(), nullable=True))
        if "prateleira_id" not in {index["name"] for index in inspector.get_indexes("exemplares")}:
            batch.create_index("ix_exemplares_prateleira_id", ["prateleira_id"])
        if "secao_id" not in {index["name"] for index in inspector.get_indexes("exemplares")}:
            batch.create_index("ix_exemplares_secao_id", ["secao_id"])
    with op.batch_alter_table("prateleiras") as batch:
        if "finalidade" not in shelf_columns:
            batch.add_column(sa.Column("finalidade", sa.String(length=100), nullable=True))
        if "genero_principal" not in shelf_columns:
            batch.add_column(sa.Column("genero_principal", sa.String(length=150), nullable=True))

    for number in range(1, 13):
        connection.execute(sa.text("INSERT INTO prateleiras (numero, descricao, ativa) SELECT :number, :descricao, 1 WHERE NOT EXISTS (SELECT 1 FROM prateleiras WHERE numero = :number)"), {"number": number, "descricao": f"Prateleira {number:02d}"})
        shelf_id = connection.execute(sa.text("SELECT id FROM prateleiras WHERE numero = :number"), {"number": number}).scalar_one()
        for section_number in range(1, 5):
            connection.execute(sa.text("INSERT INTO secoes (prateleira_id, numero, codigo_localizacao, ativa) SELECT :shelf_id, :section_number, :code, 1 WHERE NOT EXISTS (SELECT 1 FROM secoes WHERE prateleira_id = :shelf_id AND numero = :section_number)"), {"shelf_id": shelf_id, "section_number": section_number, "code": f"P{number:02d}-S{section_number:02d}"})


def downgrade() -> None:
    with op.batch_alter_table("exemplares") as batch:
        batch.drop_index("ix_exemplares_secao_id")
        batch.drop_index("ix_exemplares_prateleira_id")
        batch.drop_column("secao_id")
        batch.drop_column("prateleira_id")
    with op.batch_alter_table("prateleiras") as batch:
        batch.drop_column("genero_principal")
        batch.drop_column("finalidade")