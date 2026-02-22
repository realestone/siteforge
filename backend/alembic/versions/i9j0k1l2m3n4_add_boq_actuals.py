"""add actual_quantity and actual_comment to project_boq_items

Revision ID: i9j0k1l2m3n4
Revises: h8i9j0k1l2m3
Create Date: 2025-06-03 00:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "i9j0k1l2m3n4"
down_revision: Union[str, None] = "h8i9j0k1l2m3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "project_boq_items",
        sa.Column("actual_quantity", sa.Float, nullable=True),
    )
    op.add_column(
        "project_boq_items",
        sa.Column("actual_comment", sa.Text, nullable=True),
    )


def downgrade() -> None:
    op.drop_column("project_boq_items", "actual_comment")
    op.drop_column("project_boq_items", "actual_quantity")
