import io
import uuid
from pathlib import Path

from docx import Document
from docx.oxml.ns import qn
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.models.project import Project
from app.models.tssr import ProjectTSSR
from app.schemas.tssr import TSSRInput
from app.tssr_template_generator import generate_tssr_template
from app.tssr_template_map import TEMPLATE_MAP

router = APIRouter(prefix="/api/projects/{project_id}/tssr", tags=["tssr"])


@router.get("")
async def get_tssr(project_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ProjectTSSR).where(ProjectTSSR.project_id == project_id)
    )
    tssr = result.scalar_one_or_none()
    if not tssr:
        raise HTTPException(404, "TSSR not found for this project")
    return _tssr_to_dict(tssr)


@router.put("")
async def update_tssr(
    project_id: uuid.UUID, body: TSSRInput, db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(ProjectTSSR).where(ProjectTSSR.project_id == project_id)
    )
    tssr = result.scalar_one_or_none()
    if not tssr:
        raise HTTPException(404, "TSSR not found for this project")

    data = body.model_dump(by_alias=False)
    # Convert sector_data to plain dicts for JSONB
    data["sector_data"] = [
        s.model_dump(by_alias=False) if hasattr(s, "model_dump") else s
        for s in body.sector_data
    ]
    data["config_string"] = data.pop("config", "")
    # Convert revision_history entries to plain dicts for JSONB
    if "revision_history" in data:
        data["revision_history"] = [
            e.model_dump() if hasattr(e, "model_dump") else e
            for e in data["revision_history"]
        ]

    for field, value in data.items():
        if hasattr(tssr, field):
            setattr(tssr, field, value)

    await db.commit()
    await db.refresh(tssr)

    # TODO: trigger dependency engine recalculation here
    return _tssr_to_dict(tssr)


@router.get("/export")
async def export_tssr(
    project_id: uuid.UUID,
    format: str = Query("legacy", alias="format"),
    db: AsyncSession = Depends(get_db),
):
    """Export TSSR as filled .docx.

    Query params:
        format: "legacy" (fill original OneCo template) or "modern" (generate new template)
    """
    # Get project info
    proj_result = await db.execute(select(Project).where(Project.id == project_id))
    project = proj_result.scalar_one_or_none()
    if not project:
        raise HTTPException(404, "Project not found")

    # Get TSSR data
    result = await db.execute(
        select(ProjectTSSR).where(ProjectTSSR.project_id == project_id)
    )
    tssr = result.scalar_one_or_none()
    if not tssr:
        raise HTTPException(404, "TSSR not found for this project")

    if format == "modern":
        return _export_modern(tssr, project)

    return _export_legacy(tssr, project)


def _export_modern(tssr: ProjectTSSR, project) -> StreamingResponse:
    """Generate a modern TSSR template filled with project data."""
    data = {
        "site_name": tssr.site_name,
        "site_id": tssr.site_id,
        "site_model": tssr.site_model,
        "site_type": tssr.site_type,
        "customer": tssr.customer,
        "site_owner": tssr.site_owner,
        "site_category": tssr.site_category,
        "site_owner_offer": tssr.site_owner_offer,
        "montasjeunderlag": tssr.montasjeunderlag,
        "sart": tssr.sart,
        "veiviser": tssr.veiviser,
        "rfsr_rnp": tssr.rfsr_rnp,
        "guideline_version": tssr.guideline_version,
        "veiviser_comments": tssr.veiviser_comments,
        "iloq_required": tssr.iloq_required,
        "iloq_details": tssr.iloq_details,
        "access_instructions": tssr.access_instructions,
        "crane_needed": tssr.crane_needed,
        "tssr_alignment": tssr.tssr_alignment,
        "tssr_alignment_comments": tssr.tssr_alignment_comments,
    }
    buf = generate_tssr_template(data)
    filename = f"TSSR_{tssr.site_id or project.site_id or 'export'}_modern.docx"
    return StreamingResponse(
        buf,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


def _export_legacy(tssr: ProjectTSSR, project) -> StreamingResponse:
    """Fill the original OneCo .docx template with project data."""
    # Resolve template path
    template_path = Path(settings.tssr_template_path)
    if not template_path.is_absolute():
        template_path = Path(__file__).resolve().parent.parent.parent / template_path
    if not template_path.exists():
        raise HTTPException(500, f"TSSR template not found: {template_path}")

    # Load template
    doc = Document(str(template_path))

    # Build a lookup of all SDTs in the document, keyed by tag
    sdt_by_tag: dict[str, list] = {}
    for sdt in doc.element.findall(".//" + qn("w:sdt")):
        tag_el = sdt.find(".//" + qn("w:tag"))
        if tag_el is not None:
            tag_val = tag_el.get(qn("w:val"))
            if tag_val:
                sdt_by_tag.setdefault(tag_val, []).append(sdt)

    # Process each mapping entry
    for entry in TEMPLATE_MAP:
        db_field = entry["db_field"]
        value = getattr(tssr, db_field, "")

        # Check condition (e.g. iloq_details only if iloq_required)
        condition_field = entry.get("condition_field")
        if condition_field and not getattr(tssr, condition_field, False):
            value = ""

        # Add prefix if specified
        prefix = entry.get("prefix", "")
        text_value = (
            f"{prefix}{value}"
            if value
            else (prefix.rstrip(": ") + ":" if prefix else "")
        )

        entry_type = entry["type"]

        if entry_type in ("text", "combobox", "dropdown"):
            # SDT-based: find by tag and set content
            tag = entry["tag"]
            sdts = sdt_by_tag.get(tag, [])
            for sdt in sdts:
                _set_sdt_value(sdt, str(value) if value else "")

        elif entry_type == "plain_cell":
            # Positional: set cell text directly
            table_idx = entry["table"]
            row_idx = entry["row"]
            col_idx = entry["col"]
            if table_idx < len(doc.tables):
                _set_plain_cell(doc.tables[table_idx], row_idx, col_idx, text_value)

    # Save to buffer
    buf = io.BytesIO()
    doc.save(buf)
    buf.seek(0)

    filename = f"TSSR_{tssr.site_id or project.site_id or 'export'}.docx"
    return StreamingResponse(
        buf,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
        },
    )


def _set_sdt_value(sdt_element, value: str) -> None:
    """Set the display text of a Structured Document Tag (SDT).

    Works for TEXT, COMBOBOX, and DROPDOWN SDTs. Handles two layouts:
    1. sdtContent > w:r (run directly in content — common in table cells)
    2. sdtContent > w:p > w:r (run inside paragraph)
    Preserves the first run's formatting (rPr) and replaces its text.
    """
    content = sdt_element.find(qn("w:sdtContent"))
    if content is None:
        return

    # Case 1: Runs directly under sdtContent (no paragraph wrapper)
    direct_runs = content.findall(qn("w:r"))
    if direct_runs:
        first_run = direct_runs[0]
        for run in direct_runs[1:]:
            content.remove(run)
        t_el = first_run.find(qn("w:t"))
        if t_el is None:
            t_el = first_run.makeelement(qn("w:t"), {})
            first_run.append(t_el)
        t_el.text = value
        t_el.set(qn("xml:space"), "preserve")
        return

    # Case 2: Runs inside a paragraph
    para = content.find(qn("w:p"))
    if para is not None:
        runs = para.findall(qn("w:r"))
        if runs:
            first_run = runs[0]
            for run in runs[1:]:
                para.remove(run)
            t_el = first_run.find(qn("w:t"))
            if t_el is None:
                t_el = first_run.makeelement(qn("w:t"), {})
                first_run.append(t_el)
            t_el.text = value
            t_el.set(qn("xml:space"), "preserve")
        else:
            run = para.makeelement(qn("w:r"), {})
            t_el = run.makeelement(qn("w:t"), {})
            t_el.text = value
            t_el.set(qn("xml:space"), "preserve")
            run.append(t_el)
            para.append(run)


def _set_plain_cell(table, row: int, col: int, value: str) -> None:
    """Set a plain table cell's text, preserving the first run's formatting."""
    if row >= len(table.rows) or col >= len(table.rows[row].cells):
        return
    cell = table.rows[row].cells[col]
    if cell.paragraphs and cell.paragraphs[0].runs:
        first_run = cell.paragraphs[0].runs[0]
        font_props = {
            "bold": first_run.font.bold,
            "italic": first_run.font.italic,
            "size": first_run.font.size,
            "name": first_run.font.name,
            "color_rgb": first_run.font.color.rgb
            if first_run.font.color and first_run.font.color.rgb
            else None,
        }
        for p in cell.paragraphs:
            p.clear()
        run = cell.paragraphs[0].add_run(str(value))
        run.font.bold = font_props["bold"]
        run.font.italic = font_props["italic"]
        run.font.size = font_props["size"]
        run.font.name = font_props["name"]
        if font_props["color_rgb"]:
            run.font.color.rgb = font_props["color_rgb"]
    else:
        cell.text = str(value)


def _tssr_to_dict(tssr: ProjectTSSR) -> dict:
    return {
        "id": str(tssr.id),
        "projectId": str(tssr.project_id),
        # Site Identity
        "siteId": tssr.site_id,
        "siteName": tssr.site_name,
        "operator": tssr.operator,
        "siteModel": tssr.site_model,
        "siteType": tssr.site_type,
        "customer": tssr.customer,
        "siteOwner": tssr.site_owner,
        # Supporting Documents
        "siteOwnerOffer": tssr.site_owner_offer,
        "montasjeunderlag": tssr.montasjeunderlag,
        "sart": tssr.sart,
        "veiviser": tssr.veiviser,
        "rfsrRnp": tssr.rfsr_rnp,
        "guidelineVersion": tssr.guideline_version,
        # Access Info
        "veiviserComments": tssr.veiviser_comments,
        "iloqRequired": tssr.iloq_required,
        "iloqDetails": tssr.iloq_details,
        # TSSR Alignment
        "tssrAlignment": tssr.tssr_alignment,
        "tssrAlignmentComments": tssr.tssr_alignment_comments,
        # Radio Configuration
        "sectors": tssr.sectors,
        "size": tssr.size,
        "config": tssr.config_string,
        "sectorData": tssr.sector_data or [],
        # Access & Logistics
        "siteCategory": tssr.site_category,
        "landlordName": tssr.landlord_name,
        "accessInstructions": tssr.access_instructions,
        "craneNeeded": tssr.crane_needed,
        # Cabinet & Power
        "cabinetType": tssr.cabinet_type,
        "acdb": tssr.acdb,
        "rectifier": tssr.rectifier,
        "earthing": tssr.earthing,
        # HSE
        "hseHazards": tssr.hse_hazards or [],
        # Building Info
        "roofType": tssr.roof_type,
        "roofMaterial": tssr.roof_material,
        "roofLoad": tssr.roof_load,
        "towerHeight": tssr.tower_height,
        # Cable Routing
        "cableLadderLength": tssr.cable_ladder_length,
        "verticalCableRoute": tssr.vertical_cable_route,
        # Antenna Mounting
        "mountType": tssr.mount_type,
        # Services
        "paintingRequired": tssr.painting_required,
        "paintingColor": tssr.painting_color,
        # Revision History
        "revisionHistory": tssr.revision_history or [],
        # Other
        "additionalNotes": tssr.additional_notes,
    }
