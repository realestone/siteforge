import uuid
from typing import Any

from fastapi import APIRouter, Body, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.project import Project
from app.models.tssr import ProjectTSSR
from app.schemas.project import (
    ExportHistoryEntry,
    ProjectCreate,
    ProjectResponse,
    ProjectUpdate,
)

router = APIRouter(prefix="/api/projects", tags=["projects"])


@router.get("", response_model=list[ProjectResponse])
async def list_projects(
    site_id: str | None = None,
    limit: int = 50,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Project).order_by(Project.updated_at.desc())
    if site_id:
        stmt = stmt.where(Project.site_id == site_id)
    stmt = stmt.offset(offset).limit(limit)
    result = await db.execute(stmt)
    return result.scalars().all()


@router.post("", response_model=ProjectResponse, status_code=201)
async def create_project(body: ProjectCreate, db: AsyncSession = Depends(get_db)):
    project = Project(
        site_id=body.site_id,
        site_name=body.site_name,
        operator=body.operator,
        onedrive_folder_id=body.onedrive_folder_id,
        onedrive_folder_path=body.onedrive_folder_path,
    )
    db.add(project)
    await db.flush()

    # Create empty TSSR for the project
    tssr = ProjectTSSR(
        project_id=project.id,
        site_id=body.site_id,
        site_name=body.site_name,
        operator=body.operator,
    )
    db.add(tssr)
    await db.commit()
    await db.refresh(project)
    return project


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(project_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(404, "Project not found")
    return project


@router.patch("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: uuid.UUID, body: ProjectUpdate, db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(404, "Project not found")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(project, field, value)
    await db.commit()
    await db.refresh(project)
    return project


@router.delete("/{project_id}", status_code=204)
async def delete_project(project_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(404, "Project not found")
    await db.delete(project)
    await db.commit()


@router.post("/{project_id}/exports", response_model=list[dict], status_code=201)
async def record_export(
    project_id: uuid.UUID,
    entry: ExportHistoryEntry,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(404, "Project not found")

    history = list(project.export_history or [])
    history.append(entry.model_dump())
    project.export_history = history
    await db.commit()
    await db.refresh(project)
    return project.export_history


@router.get("/{project_id}/build-tasks", response_model=list[dict])
async def get_build_tasks(project_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(404, "Project not found")
    return project.build_tasks or []


@router.put("/{project_id}/build-tasks", response_model=list[dict])
async def update_build_tasks(
    project_id: uuid.UUID,
    tasks: list[Any] = Body(...),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(404, "Project not found")
    project.build_tasks = tasks
    await db.commit()
    await db.refresh(project)
    return project.build_tasks
