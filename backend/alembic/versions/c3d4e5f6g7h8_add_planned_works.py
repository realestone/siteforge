"""add planned_works column

Revision ID: c3d4e5f6g7h8
Revises: b2c3d4e5f6g7
Create Date: 2026-02-21
"""

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

from alembic import op

revision = "c3d4e5f6g7h8"
down_revision = "b2c3d4e5f6g7"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "project_tssr",
        sa.Column("planned_works", JSONB, nullable=True),
    )


def downgrade() -> None:
    op.drop_column("project_tssr", "planned_works")
