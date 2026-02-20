import uuid

from sqlalchemy import Boolean, Float, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, gen_uuid


class ProjectTSSR(Base, TimestampMixin):
    __tablename__ = "project_tssr"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=gen_uuid)
    project_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"), unique=True
    )

    # Site Identity
    site_id: Mapped[str] = mapped_column(String(100), default="")
    site_name: Mapped[str] = mapped_column(String(300), default="")
    operator: Mapped[str] = mapped_column(String(100), default="")
    site_model: Mapped[str] = mapped_column(String(100), default="")
    site_type: Mapped[str] = mapped_column(String(100), default="")
    customer: Mapped[str] = mapped_column(String(100), default="")
    site_owner: Mapped[str] = mapped_column(String(300), default="")

    # Supporting Documents
    site_owner_offer: Mapped[str] = mapped_column(String(100), default="")
    montasjeunderlag: Mapped[str] = mapped_column(String(100), default="")
    sart: Mapped[str] = mapped_column(String(100), default="")
    veiviser: Mapped[str] = mapped_column(String(100), default="")
    rfsr_rnp: Mapped[str] = mapped_column(String(100), default="")
    guideline_version: Mapped[str] = mapped_column(String(100), default="")

    # Access Info
    veiviser_comments: Mapped[str] = mapped_column(Text, default="")
    iloq_required: Mapped[bool] = mapped_column(Boolean, default=False)
    iloq_details: Mapped[str] = mapped_column(Text, default="")

    # TSSR Alignment
    tssr_alignment: Mapped[str] = mapped_column(String(100), default="")
    tssr_alignment_comments: Mapped[str] = mapped_column(Text, default="")

    # Radio Configuration
    config_string: Mapped[str] = mapped_column(String(50), default="")
    sectors: Mapped[int] = mapped_column(Integer, default=1)
    size: Mapped[str] = mapped_column(String(20), default="Small")
    sector_data: Mapped[dict | list] = mapped_column(JSONB, default=list)

    # Access & Logistics
    site_category: Mapped[str] = mapped_column(String(50), default="Rooftop")
    landlord_name: Mapped[str] = mapped_column(String(300), default="")
    access_instructions: Mapped[str] = mapped_column(Text, default="")
    crane_needed: Mapped[bool] = mapped_column(Boolean, default=False)

    # Cabinet & Power
    cabinet_type: Mapped[str] = mapped_column(String(50), default="Indoor")
    acdb: Mapped[str] = mapped_column(String(100), default="")
    rectifier: Mapped[str] = mapped_column(String(100), default="")
    earthing: Mapped[str] = mapped_column(String(100), default="")

    # HSE
    hse_hazards: Mapped[list] = mapped_column(JSONB, default=list)

    # Building Info
    roof_type: Mapped[str | None] = mapped_column(String(100), nullable=True)
    roof_material: Mapped[str | None] = mapped_column(String(100), nullable=True)
    roof_load: Mapped[float | None] = mapped_column(Float, nullable=True)
    tower_height: Mapped[float | None] = mapped_column(Float, nullable=True)

    # Cable Routing
    cable_ladder_length: Mapped[float | None] = mapped_column(Float, nullable=True)
    vertical_cable_route: Mapped[float | None] = mapped_column(Float, nullable=True)

    # Antenna Mounting
    mount_type: Mapped[str] = mapped_column(String(100), default="Gravitation")

    # Services
    painting_required: Mapped[bool] = mapped_column(Boolean, default=False)
    painting_color: Mapped[str | None] = mapped_column(String(100), nullable=True)

    # Revision History
    revision_history: Mapped[list] = mapped_column(JSONB, default=list)

    # Other
    additional_notes: Mapped[str] = mapped_column(Text, default="")

    project: Mapped["Project"] = relationship("Project", back_populates="tssr")
