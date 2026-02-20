import uuid

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, gen_uuid


class Project(Base, TimestampMixin):
    __tablename__ = "projects"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=gen_uuid)
    site_id: Mapped[str] = mapped_column(String(100), default="")
    site_name: Mapped[str] = mapped_column(String(300), default="")
    operator: Mapped[str] = mapped_column(String(100), default="")
    status: Mapped[str] = mapped_column(String(50), default="draft")

    tssr: Mapped["ProjectTSSR | None"] = relationship(
        "ProjectTSSR",
        back_populates="project",
        uselist=False,
        cascade="all, delete-orphan",
    )
    boq_items: Mapped[list["ProjectBOQItem"]] = relationship(
        "ProjectBOQItem", back_populates="project", cascade="all, delete-orphan"
    )
