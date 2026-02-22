import uuid

from sqlalchemy import Float, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, gen_uuid


class ProjectPhoto(Base, TimestampMixin):
    __tablename__ = "project_photos"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=gen_uuid)
    project_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"), index=True
    )
    original_filename: Mapped[str] = mapped_column(String(500))
    auto_filename: Mapped[str | None] = mapped_column(String(500), nullable=True)
    file_path: Mapped[str] = mapped_column(String(1000))
    thumbnail_path: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    mime_type: Mapped[str] = mapped_column(String(100))
    file_size: Mapped[int] = mapped_column(Integer)
    section: Mapped[str] = mapped_column(String(50), default="unsorted")
    sector_id: Mapped[str | None] = mapped_column(String(10), nullable=True)
    caption: Mapped[str | None] = mapped_column(Text, nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    annotations: Mapped[dict | None] = mapped_column(JSONB, default=list)
    exif_compass: Mapped[float | None] = mapped_column(Float, nullable=True)
    onedrive_item_id: Mapped[str | None] = mapped_column(String(500), nullable=True)
    phase: Mapped[str] = mapped_column(String(20), default="planning")

    project: Mapped["Project"] = relationship(back_populates="photos")
