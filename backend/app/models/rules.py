import uuid

from sqlalchemy import Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, gen_uuid


class DependencyRule(Base, TimestampMixin):
    __tablename__ = "dependency_rules"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=gen_uuid)
    catalog_product_code: Mapped[str] = mapped_column(String(100), index=True)
    rule_type: Mapped[str] = mapped_column(String(50))
    expression: Mapped[str] = mapped_column(Text)
    parameters: Mapped[dict] = mapped_column(JSONB, default=dict)
    priority: Mapped[int] = mapped_column(Integer, default=0)
