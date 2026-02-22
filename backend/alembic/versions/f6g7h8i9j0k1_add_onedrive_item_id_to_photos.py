"""add onedrive_item_id to project_photos

Revision ID: f6g7h8i9j0k1
Revises: e5f6g7h8i9j0
Create Date: 2026-02-17
"""

import sqlalchemy as sa

from alembic import op

revision = "f6g7h8i9j0k1"
down_revision = "e5f6g7h8i9j0"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "project_photos",
        sa.Column("onedrive_item_id", sa.String(500), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("project_photos", "onedrive_item_id")
