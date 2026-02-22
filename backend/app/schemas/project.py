import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel


class ProjectCreate(BaseModel):
    site_id: str
    site_name: str
    operator: str
    onedrive_folder_id: str | None = None
    onedrive_folder_path: str | None = None


class ProjectUpdate(BaseModel):
    site_id: str | None = None
    site_name: str | None = None
    operator: str | None = None
    status: str | None = None
    onedrive_folder_id: str | None = None
    onedrive_folder_path: str | None = None
    tssr_export_version: int | None = None
    boq_export_version: int | None = None


class ExportHistoryEntry(BaseModel):
    type: str  # "tssr" | "tssr-modern" | "boq"
    version: int
    destination: str  # "download" | "onedrive"
    filename: str
    timestamp: str  # ISO 8601
    onedrive_path: str | None = None


class ProjectResponse(BaseModel):
    id: uuid.UUID
    site_id: str
    site_name: str
    operator: str
    status: str
    onedrive_folder_id: str | None = None
    onedrive_folder_path: str | None = None
    tssr_export_version: int = 0
    boq_export_version: int = 0
    export_history: list[Any] = []
    build_tasks: list[Any] = []
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
