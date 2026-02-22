"""add deviations free text

Revision ID: k1l2m3n4o5p6
Revises: j0k1l2m3n4o5
Create Date: 2026-02-17
"""

import sqlalchemy as sa

from alembic import op

revision = "k1l2m3n4o5p6"
down_revision = "j0k1l2m3n4o5"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "project_tssr",
        sa.Column("deviations_free_text", sa.Text(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("project_tssr", "deviations_free_text")
