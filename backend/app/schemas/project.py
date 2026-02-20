import uuid
from datetime import datetime

from pydantic import BaseModel


class ProjectCreate(BaseModel):
    site_id: str
    site_name: str
    operator: str


class ProjectUpdate(BaseModel):
    site_id: str | None = None
    site_name: str | None = None
    operator: str | None = None
    status: str | None = None


class ProjectResponse(BaseModel):
    id: uuid.UUID
    site_id: str
    site_name: str
    operator: str
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
