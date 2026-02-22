"""add onedrive folder fields and export version tracking to projects

Revision ID: e5f6g7h8i9j0
Revises: d4e5f6g7h8i9
Create Date: 2026-02-22
"""

import sqlalchemy as sa

from alembic import op

revision = "e5f6g7h8i9j0"
down_revision = "d4e5f6g7h8i9"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "projects", sa.Column("onedrive_folder_id", sa.String(500), nullable=True)
    )
    op.add_column(
        "projects", sa.Column("onedrive_folder_path", sa.String(1000), nullable=True)
    )
    op.add_column(
        "projects",
        sa.Column(
            "tssr_export_version", sa.Integer(), nullable=False, server_default="0"
        ),
    )
    op.add_column(
        "projects",
        sa.Column(
            "boq_export_version", sa.Integer(), nullable=False, server_default="0"
        ),
    )


def downgrade() -> None:
    op.drop_column("projects", "boq_export_version")
    op.drop_column("projects", "tssr_export_version")
    op.drop_column("projects", "onedrive_folder_path")
    op.drop_column("projects", "onedrive_folder_id")
