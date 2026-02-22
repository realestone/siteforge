"""add photo phase

Revision ID: j0k1l2m3n4o5
Revises: i9j0k1l2m3n4
Create Date: 2026-02-17
"""

import sqlalchemy as sa

from alembic import op

revision = "j0k1l2m3n4o5"
down_revision = "i9j0k1l2m3n4"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "project_photos",
        sa.Column("phase", sa.String(20), server_default="planning", nullable=False),
    )


def downgrade() -> None:
    op.drop_column("project_photos", "phase")
