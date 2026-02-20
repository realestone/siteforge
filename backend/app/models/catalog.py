import enum
import uuid

from sqlalchemy import Enum, Index, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, gen_uuid


class CatalogSection(str, enum.Enum):
    """The 4 logical sections parsed from the Excel template."""

    product = "product"  # BoQ sheet, hardware (Source of ordering = Lyse Tele)
    service = "service"  # BoQ sheet, labor/work (Source of ordering = TI contractor)
    griptel = "griptel"  # BoM Griptel sheet
    solar = "solar"  # BoM Solar sheet


class BOQCatalogItem(Base, TimestampMixin):
    __tablename__ = "boq_catalog"
    __table_args__ = (
        UniqueConstraint("row_index", "sheet_name", name="uq_catalog_row_sheet"),
        Index("ix_catalog_section", "section"),
        Index("ix_catalog_product_category", "product_category"),
        Index(
            "ix_catalog_search",
            "product_code",
            "description",
            "product_category",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=gen_uuid)

    # Excel anchor — which sheet + row this came from (for write-back on export)
    row_index: Mapped[int] = mapped_column(Integer)
    sheet_name: Mapped[str] = mapped_column(String(100))

    # Logical section (derived during import)
    section: Mapped[CatalogSection] = mapped_column(
        Enum(CatalogSection, name="catalog_section"),
        default=CatalogSection.product,
    )

    # The 7 core fields extracted from Excel
    product_code: Mapped[str] = mapped_column(String(100), index=True)
    description: Mapped[str] = mapped_column(Text, default="")
    comments: Mapped[str | None] = mapped_column(Text, nullable=True)
    ordering_hints: Mapped[str | None] = mapped_column(Text, nullable=True)
    product_category: Mapped[str] = mapped_column(String(200), default="")
    product_subcategory: Mapped[str | None] = mapped_column(String(200), nullable=True)
    vendor: Mapped[str | None] = mapped_column(String(200), nullable=True)
