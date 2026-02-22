"""add project_photos table

Revision ID: d4e5f6g7h8i9
Revises: c3d4e5f6g7h8
Create Date: 2026-02-17
"""

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

from alembic import op

revision = "d4e5f6g7h8i9"
down_revision = "c3d4e5f6g7h8"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "project_photos",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column(
            "project_id",
            sa.Uuid(),
            sa.ForeignKey("projects.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("original_filename", sa.String(500), nullable=False),
        sa.Column("auto_filename", sa.String(500), nullable=True),
        sa.Column("file_path", sa.String(1000), nullable=False),
        sa.Column("thumbnail_path", sa.String(1000), nullable=True),
        sa.Column("mime_type", sa.String(100), nullable=False),
        sa.Column("file_size", sa.Integer(), nullable=False),
        sa.Column("section", sa.String(50), nullable=False, server_default="unsorted"),
        sa.Column("sector_id", sa.String(10), nullable=True),
        sa.Column("caption", sa.Text(), nullable=True),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("annotations", JSONB(), nullable=True, server_default="[]"),
        sa.Column("exif_compass", sa.Float(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index("ix_project_photos_project_id", "project_photos", ["project_id"])
    op.create_index(
        "ix_project_photos_project_section",
        "project_photos",
        ["project_id", "section"],
    )


def downgrade() -> None:
    op.drop_index("ix_project_photos_project_section")
    op.drop_index("ix_project_photos_project_id")
    op.drop_table("project_photos")
