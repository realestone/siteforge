"""add as-built version counters

Revision ID: l2m3n4o5p6q7
Revises: k1l2m3n4o5p6
Create Date: 2026-02-17
"""

import sqlalchemy as sa

from alembic import op

revision = "l2m3n4o5p6q7"
down_revision = "k1l2m3n4o5p6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "projects",
        sa.Column(
            "as_built_tssr_version", sa.Integer(), server_default="0", nullable=False
        ),
    )
    op.add_column(
        "projects",
        sa.Column(
            "as_built_boq_version", sa.Integer(), server_default="0", nullable=False
        ),
    )


def downgrade() -> None:
    op.drop_column("projects", "as_built_boq_version")
    op.drop_column("projects", "as_built_tssr_version")
