import uuid

from sqlalchemy import Boolean, Float, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, gen_uuid


class ProjectBOQItem(Base, TimestampMixin):
    """A single BOQ line item for a project.

    Links to the master catalog via catalog_item_id.
    Catalog fields (description, vendor, etc.) are accessed through the
    'catalog_item' relationship — not duplicated here.
    """

    __tablename__ = "project_boq_items"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=gen_uuid)
    project_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"), index=True
    )
    catalog_item_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("boq_catalog.id", ondelete="SET NULL"), nullable=True, index=True
    )

    # Denormalized product_code for quick access without join
    # (also allows custom items not in catalog)
    product_code: Mapped[str] = mapped_column(String(100), default="")

    # Per-project data
    quantity: Mapped[float] = mapped_column(Float, default=0.0)
    rule_applied: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_manual_override: Mapped[bool] = mapped_column(Boolean, default=False)
    override_note: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relationships
    project: Mapped["Project"] = relationship("Project", back_populates="boq_items")
    catalog_item: Mapped["BOQCatalogItem | None"] = relationship(
        "BOQCatalogItem", lazy="joined"
    )
