"""Require every physical copy to have a shelf."""

from alembic import op
import sqlalchemy as sa


revision = "0006_obrigar_localizacao_exemplares"
down_revision = "0005_localizacao_exemplares"
branch_labels = None
depends_on = None


def upgrade() -> None:
    connection = op.get_bind()
    shelf_id = connection.execute(
        sa.text("SELECT id FROM prateleiras WHERE numero = 1")
    ).scalar()
    if shelf_id is None:
        connection.execute(
            sa.text("INSERT INTO prateleiras (numero, descricao, ativa) VALUES (1, 'Prateleira 01', 1)")
        )
        shelf_id = connection.execute(
            sa.text("SELECT id FROM prateleiras WHERE numero = 1")
        ).scalar_one()
    connection.execute(
        sa.text("UPDATE exemplares SET prateleira_id = :shelf_id, secao_id = NULL WHERE prateleira_id IS NULL"),
        {"shelf_id": shelf_id},
    )
    with op.batch_alter_table("exemplares") as batch:
        batch.alter_column("prateleira_id", existing_type=sa.Integer(), nullable=False)


def downgrade() -> None:
    with op.batch_alter_table("exemplares") as batch:
        batch.alter_column("prateleira_id", existing_type=sa.Integer(), nullable=True)