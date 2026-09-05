"""Add audit log and exemplar status metadata."""

from alembic import op
import sqlalchemy as sa


revision = "0003_auditoria_situacao_exemplares"
down_revision = "0002_auditoria_constraints"
branch_labels = None
depends_on = None


def upgrade() -> None:
    connection = op.get_bind()
    inspector = sa.inspect(connection)
    if "auditoria" not in inspector.get_table_names():
        op.create_table(
            "auditoria",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("usuario_id", sa.Integer(), nullable=True),
            sa.Column("acao", sa.String(length=80), nullable=False),
            sa.Column("entidade", sa.String(length=80), nullable=False),
            sa.Column("entidade_id", sa.Integer(), nullable=True),
            sa.Column("detalhes", sa.Text(), nullable=True),
            sa.Column("criado_em", sa.DateTime(), server_default=sa.func.now(), nullable=False),
            sa.ForeignKeyConstraint(["usuario_id"], ["usuarios.id"]),
        )
    existing_indexes = {item["name"] for item in sa.inspect(connection).get_indexes("auditoria")}
    for name, columns in {
        "ix_auditoria_usuario_id": ["usuario_id"],
        "ix_auditoria_acao": ["acao"],
        "ix_auditoria_entidade": ["entidade"],
        "ix_auditoria_entidade_id": ["entidade_id"],
        "ix_auditoria_criado_em": ["criado_em"],
    }.items():
        if name not in existing_indexes:
            op.create_index(name, "auditoria", columns)
    exemplar_columns = {item["name"] for item in sa.inspect(connection).get_columns("exemplares")}
    if "situacao_alterada_em" not in exemplar_columns or "situacao_alterada_por_id" not in exemplar_columns:
        with op.batch_alter_table("exemplares") as batch:
            if "situacao_alterada_em" not in exemplar_columns:
                batch.add_column(sa.Column("situacao_alterada_em", sa.DateTime(), nullable=True))
            if "situacao_alterada_por_id" not in exemplar_columns:
                batch.add_column(sa.Column("situacao_alterada_por_id", sa.Integer(), nullable=True))
            batch.create_foreign_key("fk_exemplares_situacao_alterada_por_id_usuarios", "usuarios", ["situacao_alterada_por_id"], ["id"])
            batch.create_index("ix_exemplares_situacao_alterada_por_id", ["situacao_alterada_por_id"])


def downgrade() -> None:
    with op.batch_alter_table("exemplares") as batch:
        batch.drop_index("ix_exemplares_situacao_alterada_por_id")
        batch.drop_constraint("fk_exemplares_situacao_alterada_por_id_usuarios", type_="foreignkey")
        batch.drop_column("situacao_alterada_por_id")
        batch.drop_column("situacao_alterada_em")
    for name in ["ix_auditoria_criado_em", "ix_auditoria_entidade_id", "ix_auditoria_entidade", "ix_auditoria_acao", "ix_auditoria_usuario_id"]:
        op.drop_index(name, table_name="auditoria")
    op.drop_table("auditoria")
