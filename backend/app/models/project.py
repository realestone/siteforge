import uuid

from sqlalchemy import String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, gen_uuid


class Project(Base, TimestampMixin):
    __tablename__ = "projects"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=gen_uuid)
    site_id: Mapped[str] = mapped_column(String(100), default="")
    site_name: Mapped[str] = mapped_column(String(300), default="")
    operator: Mapped[str] = mapped_column(String(100), default="")
    status: Mapped[str] = mapped_column(String(50), default="draft")
    onedrive_folder_id: Mapped[str | None] = mapped_column(
        String(500), nullable=True, default=None
    )
    onedrive_folder_path: Mapped[str | None] = mapped_column(
        String(1000), nullable=True, default=None
    )
    tssr_export_version: Mapped[int] = mapped_column(default=0)
    boq_export_version: Mapped[int] = mapped_column(default=0)
    export_history: Mapped[list] = mapped_column(JSONB, default=list)
    build_tasks: Mapped[list] = mapped_column(JSONB, default=list)
    as_built_tssr_version: Mapped[int] = mapped_column(default=0)
    as_built_boq_version: Mapped[int] = mapped_column(default=0)

    tssr: Mapped["ProjectTSSR | None"] = relationship(
        "ProjectTSSR",
        back_populates="project",
        uselist=False,
        cascade="all, delete-orphan",
    )
    boq_items: Mapped[list["ProjectBOQItem"]] = relationship(
        "ProjectBOQItem", back_populates="project", cascade="all, delete-orphan"
    )
    photos: Mapped[list["ProjectPhoto"]] = relationship(
        "ProjectPhoto", back_populates="project", cascade="all, delete-orphan"
    )
