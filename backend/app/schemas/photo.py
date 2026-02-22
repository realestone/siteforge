import uuid

from pydantic import BaseModel, ConfigDict, Field


class PhotoResponse(BaseModel):
    id: uuid.UUID
    project_id: uuid.UUID = Field(alias="projectId")
    original_filename: str = Field(alias="originalFilename")
    auto_filename: str | None = Field(None, alias="autoFilename")
    file_url: str = Field(alias="fileUrl")
    thumbnail_url: str | None = Field(None, alias="thumbnailUrl")
    mime_type: str = Field(alias="mimeType")
    file_size: int = Field(alias="fileSize")
    section: str = "unsorted"
    sector_id: str | None = Field(None, alias="sectorId")
    caption: str | None = None
    sort_order: int = Field(0, alias="sortOrder")
    annotations: list | None = None
    exif_compass: float | None = Field(None, alias="exifCompass")
    onedrive_item_id: str | None = Field(None, alias="onedriveItemId")
    phase: str = "planning"

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)


class PhotoUpdate(BaseModel):
    section: str | None = None
    sector_id: str | None = Field(None, alias="sectorId")
    caption: str | None = None
    sort_order: int | None = Field(None, alias="sortOrder")
    auto_filename: str | None = Field(None, alias="autoFilename")
    annotations: list | None = None
    phase: str | None = None

    model_config = ConfigDict(populate_by_name=True)


class PhotoBulkReorder(BaseModel):
    photo_ids: list[uuid.UUID] = Field(alias="photoIds")

    model_config = ConfigDict(populate_by_name=True)
