"""add tssr first page fields

Revision ID: a1b2c3d4e5f6
Revises: c37d40824f3a
Create Date: 2026-02-17 20:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, None] = "c37d40824f3a"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Site Identity additions
    op.add_column(
        "project_tssr",
        sa.Column("site_model", sa.String(100), server_default="", nullable=False),
    )
    op.add_column(
        "project_tssr",
        sa.Column("site_type", sa.String(100), server_default="", nullable=False),
    )
    op.add_column(
        "project_tssr",
        sa.Column("customer", sa.String(100), server_default="", nullable=False),
    )
    op.add_column(
        "project_tssr",
        sa.Column("site_owner", sa.String(300), server_default="", nullable=False),
    )

    # Supporting Documents
    op.add_column(
        "project_tssr",
        sa.Column(
            "site_owner_offer", sa.String(100), server_default="", nullable=False
        ),
    )
    op.add_column(
        "project_tssr",
        sa.Column(
            "montasjeunderlag", sa.String(100), server_default="", nullable=False
        ),
    )
    op.add_column(
        "project_tssr",
        sa.Column("sart", sa.String(100), server_default="", nullable=False),
    )
    op.add_column(
        "project_tssr",
        sa.Column("veiviser", sa.String(100), server_default="", nullable=False),
    )
    op.add_column(
        "project_tssr",
        sa.Column("rfsr_rnp", sa.String(100), server_default="", nullable=False),
    )
    op.add_column(
        "project_tssr",
        sa.Column(
            "guideline_version", sa.String(100), server_default="", nullable=False
        ),
    )

    # Access Info
    op.add_column(
        "project_tssr",
        sa.Column("veiviser_comments", sa.Text(), server_default="", nullable=False),
    )
    op.add_column(
        "project_tssr",
        sa.Column(
            "iloq_required",
            sa.Boolean(),
            server_default=sa.text("false"),
            nullable=False,
        ),
    )
    op.add_column(
        "project_tssr",
        sa.Column("iloq_details", sa.Text(), server_default="", nullable=False),
    )

    # TSSR Alignment
    op.add_column(
        "project_tssr",
        sa.Column("tssr_alignment", sa.String(100), server_default="", nullable=False),
    )
    op.add_column(
        "project_tssr",
        sa.Column(
            "tssr_alignment_comments", sa.Text(), server_default="", nullable=False
        ),
    )


def downgrade() -> None:
    op.drop_column("project_tssr", "tssr_alignment_comments")
    op.drop_column("project_tssr", "tssr_alignment")
    op.drop_column("project_tssr", "iloq_details")
    op.drop_column("project_tssr", "iloq_required")
    op.drop_column("project_tssr", "veiviser_comments")
    op.drop_column("project_tssr", "guideline_version")
    op.drop_column("project_tssr", "rfsr_rnp")
    op.drop_column("project_tssr", "veiviser")
    op.drop_column("project_tssr", "sart")
    op.drop_column("project_tssr", "montasjeunderlag")
    op.drop_column("project_tssr", "site_owner_offer")
    op.drop_column("project_tssr", "site_owner")
    op.drop_column("project_tssr", "customer")
    op.drop_column("project_tssr", "site_type")
    op.drop_column("project_tssr", "site_model")
