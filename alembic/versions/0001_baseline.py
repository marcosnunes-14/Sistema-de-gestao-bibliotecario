"""Baseline for the existing SQLite schema."""

from alembic import op

revision = "0001_baseline"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Existing databases should be stamped with this baseline.
    pass


def downgrade() -> None:
    pass
