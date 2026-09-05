"""Add audit foreign keys and indexes."""

from alembic import op

revision = "0002_auditoria_constraints"
down_revision = "0001_baseline"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("emprestimos", recreate="always") as batch:
        batch.create_foreign_key(
            "fk_emprestimos_realizado_por_id_usuarios",
            "usuarios",
            ["realizado_por_id"],
            ["id"],
        )
        batch.create_foreign_key(
            "fk_emprestimos_devolvido_por_id_usuarios",
            "usuarios",
            ["devolvido_por_id"],
            ["id"],
        )
        batch.create_index("ix_emprestimos_realizado_por_id", ["realizado_por_id"])
        batch.create_index("ix_emprestimos_devolvido_por_id", ["devolvido_por_id"])

    with op.batch_alter_table("exemplares", recreate="always") as batch:
        batch.create_foreign_key(
            "fk_exemplares_cadastrado_por_id_usuarios",
            "usuarios",
            ["cadastrado_por_id"],
            ["id"],
        )
        batch.create_index("ix_exemplares_cadastrado_por_id", ["cadastrado_por_id"])


def downgrade() -> None:
    with op.batch_alter_table("exemplares", recreate="always") as batch:
        batch.drop_index("ix_exemplares_cadastrado_por_id")
        batch.drop_constraint("fk_exemplares_cadastrado_por_id_usuarios", type_="foreignkey")

    with op.batch_alter_table("emprestimos", recreate="always") as batch:
        batch.drop_index("ix_emprestimos_devolvido_por_id")
        batch.drop_index("ix_emprestimos_realizado_por_id")
        batch.drop_constraint("fk_emprestimos_devolvido_por_id_usuarios", type_="foreignkey")
        batch.drop_constraint("fk_emprestimos_realizado_por_id_usuarios", type_="foreignkey")
