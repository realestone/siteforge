"""add revision_history column

Revision ID: b2c3d4e5f6g7
Revises: a1b2c3d4e5f6
Create Date: 2026-02-20
"""

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

from alembic import op

revision = "b2c3d4e5f6g7"
down_revision = "a1b2c3d4e5f6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "project_tssr",
        sa.Column("revision_history", JSONB, server_default="[]", nullable=False),
    )


def downgrade() -> None:
    op.drop_column("project_tssr", "revision_history")
