import uuid
from pathlib import Path

import httpx
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.models.photo import ProjectPhoto
from app.models.project import Project
from app.schemas.photo import PhotoBulkReorder, PhotoResponse, PhotoUpdate

router = APIRouter(prefix="/api/projects/{project_id}/photos", tags=["photos"])

UPLOADS_ROOT = Path(settings.uploads_dir)
MAX_THUMB_WIDTH = 400


def _photo_to_response(photo: ProjectPhoto) -> PhotoResponse:
    """Convert ORM photo to response with computed URLs."""
    return PhotoResponse(
        id=photo.id,
        projectId=photo.project_id,
        originalFilename=photo.original_filename,
        autoFilename=photo.auto_filename,
        fileUrl=f"/uploads/{photo.file_path}",
        thumbnailUrl=f"/uploads/{photo.thumbnail_path}"
        if photo.thumbnail_path
        else None,
        mimeType=photo.mime_type,
        fileSize=photo.file_size,
        section=photo.section,
        sectorId=photo.sector_id,
        caption=photo.caption,
        sortOrder=photo.sort_order,
        annotations=photo.annotations,
        exifCompass=photo.exif_compass,
        onedriveItemId=photo.onedrive_item_id,
        phase=photo.phase,
    )


def _generate_thumbnail(src: Path, dst: Path) -> bool:
    """Generate a thumbnail image. Returns True on success."""
    try:
        from PIL import Image

        img = Image.open(src)
        # Handle EXIF orientation
        try:
            from PIL import ExifTags

            for orientation_key in ExifTags.TAGS:
                if ExifTags.TAGS[orientation_key] == "Orientation":
                    break
            exif = img._getexif()
            if exif and orientation_key in exif:
                orient = exif[orientation_key]
                if orient == 3:
                    img = img.rotate(180, expand=True)
                elif orient == 6:
                    img = img.rotate(270, expand=True)
                elif orient == 8:
                    img = img.rotate(90, expand=True)
        except Exception:
            pass

        ratio = MAX_THUMB_WIDTH / img.width if img.width > MAX_THUMB_WIDTH else 1
        new_size = (int(img.width * ratio), int(img.height * ratio))
        img.thumbnail(new_size, Image.LANCZOS)
        dst.parent.mkdir(parents=True, exist_ok=True)
        img.save(dst, "JPEG", quality=85)
        return True
    except Exception:
        return False


@router.post("", response_model=list[PhotoResponse])
async def upload_photos(
    project_id: uuid.UUID,
    files: list[UploadFile] = File(...),
    phase: str = Query("planning"),
    db: AsyncSession = Depends(get_db),
):
    """Upload one or more photos to a project."""
    # Verify project exists
    project = await db.get(Project, project_id)
    if not project:
        raise HTTPException(404, "Project not found")

    # Prepare directories
    originals_dir = UPLOADS_ROOT / str(project_id) / "photos" / "originals"
    thumbs_dir = UPLOADS_ROOT / str(project_id) / "photos" / "thumbnails"
    originals_dir.mkdir(parents=True, exist_ok=True)
    thumbs_dir.mkdir(parents=True, exist_ok=True)

    # Get current max sort_order
    result = await db.execute(
        select(ProjectPhoto.sort_order)
        .where(ProjectPhoto.project_id == project_id)
        .order_by(ProjectPhoto.sort_order.desc())
        .limit(1)
    )
    max_order = result.scalar() or 0

    created: list[ProjectPhoto] = []

    for i, upload_file in enumerate(files):
        if not upload_file.content_type or not upload_file.content_type.startswith(
            "image/"
        ):
            continue

        photo_id = uuid.uuid4()
        ext = Path(upload_file.filename or "photo.jpg").suffix or ".jpg"
        stored_name = f"{photo_id}{ext}"

        # Save original
        original_path = originals_dir / stored_name
        content = await upload_file.read()
        original_path.write_bytes(content)

        # Generate thumbnail
        thumb_name = f"{photo_id}.jpg"
        thumb_path = thumbs_dir / thumb_name
        thumb_ok = _generate_thumbnail(original_path, thumb_path)

        # Relative paths for DB
        rel_original = f"{project_id}/photos/originals/{stored_name}"
        rel_thumb = f"{project_id}/photos/thumbnails/{thumb_name}" if thumb_ok else None

        photo = ProjectPhoto(
            id=photo_id,
            project_id=project_id,
            original_filename=upload_file.filename or "photo.jpg",
            file_path=rel_original,
            thumbnail_path=rel_thumb,
            mime_type=upload_file.content_type or "image/jpeg",
            file_size=len(content),
            section="unsorted",
            sort_order=max_order + i + 1,
            annotations=[],
            phase=phase,
        )
        db.add(photo)
        created.append(photo)

    await db.commit()
    for p in created:
        await db.refresh(p)

    return [_photo_to_response(p) for p in created]


@router.get("", response_model=list[PhotoResponse])
async def list_photos(
    project_id: uuid.UUID,
    section: str | None = Query(None),
    phase: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """List all photos for a project, optionally filtered by section and/or phase."""
    query = (
        select(ProjectPhoto)
        .where(ProjectPhoto.project_id == project_id)
        .order_by(ProjectPhoto.sort_order)
    )
    if section:
        query = query.where(ProjectPhoto.section == section)
    if phase:
        query = query.where(ProjectPhoto.phase == phase)

    result = await db.execute(query)
    photos = result.scalars().all()
    return [_photo_to_response(p) for p in photos]


@router.patch("/{photo_id}", response_model=PhotoResponse)
async def update_photo(
    project_id: uuid.UUID,
    photo_id: uuid.UUID,
    update: PhotoUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Update photo metadata (section, caption, annotations, sort_order)."""
    photo = await db.get(ProjectPhoto, photo_id)
    if not photo or photo.project_id != project_id:
        raise HTTPException(404, "Photo not found")

    update_data = update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(photo, field, value)

    await db.commit()
    await db.refresh(photo)
    return _photo_to_response(photo)


@router.delete("/{photo_id}", status_code=204)
async def delete_photo(
    project_id: uuid.UUID,
    photo_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Delete a photo and its files."""
    photo = await db.get(ProjectPhoto, photo_id)
    if not photo or photo.project_id != project_id:
        raise HTTPException(404, "Photo not found")

    # Delete files from disk
    original = UPLOADS_ROOT / photo.file_path
    if original.exists():
        original.unlink()
    if photo.thumbnail_path:
        thumb = UPLOADS_ROOT / photo.thumbnail_path
        if thumb.exists():
            thumb.unlink()

    await db.delete(photo)
    await db.commit()


@router.post("/reorder", status_code=204)
async def reorder_photos(
    project_id: uuid.UUID,
    body: PhotoBulkReorder,
    db: AsyncSession = Depends(get_db),
):
    """Bulk reorder photos by providing ordered list of photo IDs."""
    for i, pid in enumerate(body.photo_ids):
        photo = await db.get(ProjectPhoto, pid)
        if photo and photo.project_id == project_id:
            photo.sort_order = i
    await db.commit()


class OneDrivePhotoItem(BaseModel):
    onedrive_item_id: str
    filename: str
    mime_type: str = "image/jpeg"
    download_url: str
    file_size: int = 0


class OneDriveImportRequest(BaseModel):
    photos: list[OneDrivePhotoItem]
    phase: str = "planning"


@router.post("/import-onedrive", response_model=list[PhotoResponse])
async def import_from_onedrive(
    project_id: uuid.UUID,
    body: OneDriveImportRequest,
    db: AsyncSession = Depends(get_db),
):
    """Import photos from OneDrive by downloading them via provided URLs."""
    project = await db.get(Project, project_id)
    if not project:
        raise HTTPException(404, "Project not found")

    originals_dir = UPLOADS_ROOT / str(project_id) / "photos" / "originals"
    thumbs_dir = UPLOADS_ROOT / str(project_id) / "photos" / "thumbnails"
    originals_dir.mkdir(parents=True, exist_ok=True)
    thumbs_dir.mkdir(parents=True, exist_ok=True)

    # Get current max sort_order
    result = await db.execute(
        select(ProjectPhoto.sort_order)
        .where(ProjectPhoto.project_id == project_id)
        .order_by(ProjectPhoto.sort_order.desc())
        .limit(1)
    )
    max_order = result.scalar() or 0

    created: list[ProjectPhoto] = []

    async with httpx.AsyncClient(timeout=60.0) as client:
        for i, item in enumerate(body.photos):
            try:
                resp = await client.get(item.download_url)
                resp.raise_for_status()
                content = resp.content
            except Exception as e:
                print(f"Failed to download {item.filename}: {e}")
                continue

            photo_id = uuid.uuid4()
            ext = Path(item.filename).suffix or ".jpg"
            stored_name = f"{photo_id}{ext}"

            # Save original
            original_path = originals_dir / stored_name
            original_path.write_bytes(content)

            # Generate thumbnail
            thumb_name = f"{photo_id}.jpg"
            thumb_path = thumbs_dir / thumb_name
            thumb_ok = _generate_thumbnail(original_path, thumb_path)

            rel_original = f"{project_id}/photos/originals/{stored_name}"
            rel_thumb = (
                f"{project_id}/photos/thumbnails/{thumb_name}" if thumb_ok else None
            )

            photo = ProjectPhoto(
                id=photo_id,
                project_id=project_id,
                original_filename=item.filename,
                file_path=rel_original,
                thumbnail_path=rel_thumb,
                mime_type=item.mime_type,
                file_size=len(content),
                section="unsorted",
                sort_order=max_order + i + 1,
                annotations=[],
                onedrive_item_id=item.onedrive_item_id,
                phase=body.phase,
            )
            db.add(photo)
            created.append(photo)

    await db.commit()
    for p in created:
        await db.refresh(p)

    return [_photo_to_response(p) for p in created]
