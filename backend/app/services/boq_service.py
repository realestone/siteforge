"""BOQ computation, catalog resolution, diff calculation, and persistence."""

from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.models.boq import ProjectBOQItem
from app.models.catalog import BOQCatalogItem
from app.services.dependency_engine import (
    BOQCalculation,
    RadioPlanCell,
    RadioPlanInput,
    RadioPlanSector,
    compute_boq,
)


def _schema_to_engine(body) -> RadioPlanInput:
    """Convert Pydantic RadioPlanComputeRequest to engine dataclass."""
    return RadioPlanInput(
        site_id=body.site_id,
        project=body.project,
        config=body.config,
        total_cells=body.total_cells,
        sectors=[
            RadioPlanSector(
                id=s.id,
                azimuth=s.azimuth,
                m_tilt=s.m_tilt,
                e_tilt=s.e_tilt,
                antennas=s.antennas,
                technologies=s.technologies,
                cells=[
                    RadioPlanCell(
                        cell_id=c.cell_id,
                        technology=c.technology,
                        antenna_type=c.antenna_type,
                        m_tilt=c.m_tilt,
                        e_tilt=c.e_tilt,
                        feed_length=c.feed_length,
                        cable_type=c.cable_type,
                        jumpers=c.jumpers,
                    )
                    for c in s.cells
                ],
                feed_length=s.feed_length,
                cable_type=s.cable_type,
                jumpers=s.jumpers,
            )
            for s in body.sectors
        ],
        raw_rows=[
            RadioPlanCell(
                cell_id=r.cell_id,
                technology=r.technology,
                antenna_type=r.antenna_type,
                m_tilt=r.m_tilt,
                e_tilt=r.e_tilt,
                feed_length=r.feed_length,
                cable_type=r.cable_type,
                jumpers=r.jumpers,
            )
            for r in body.raw_rows
        ],
    )


async def _resolve_catalog(
    product_codes: list[str], db: AsyncSession
) -> dict[str, BOQCatalogItem]:
    """Batch-lookup product codes in the catalog. Returns code -> catalog item."""
    if not product_codes:
        return {}
    result = await db.execute(
        select(BOQCatalogItem).where(BOQCatalogItem.product_code.in_(product_codes))
    )
    items = result.scalars().all()
    return {item.product_code: item for item in items}


def _calc_to_response(calc: BOQCalculation, catalog: dict[str, BOQCatalogItem]) -> dict:
    """Convert a BOQCalculation + optional catalog match to response dict."""
    cat = catalog.get(calc.product_code)
    if cat:
        return {
            "productCode": calc.product_code,
            "description": cat.description,
            "quantity": calc.quantity,
            "section": cat.section.value if cat.section else calc.section,
            "productCategory": cat.product_category or calc.category,
            "productSubcategory": cat.product_subcategory,
            "vendor": cat.vendor,
            "ruleApplied": calc.rule,
            "rowIndex": cat.row_index,
            "sheetName": cat.sheet_name,
            "inCatalog": True,
        }
    else:
        return {
            "productCode": calc.product_code,
            "description": f"[Not in catalog] {calc.product_code}",
            "quantity": calc.quantity,
            "section": calc.section,
            "productCategory": calc.category,
            "productSubcategory": None,
            "vendor": None,
            "ruleApplied": calc.rule,
            "rowIndex": None,
            "sheetName": None,
            "inCatalog": False,
        }


async def compute_and_persist(
    project_id: uuid.UUID,
    body,
    db: AsyncSession,
) -> dict:
    """Run dependency engine, resolve against catalog, persist, return response.

    1. Convert Pydantic input -> engine dataclasses
    2. Run all rules -> list of (product_code, quantity, rule)
    3. Batch-resolve product codes against boq_catalog
    4. Diff against existing project BOQ items
    5. Upsert: create/update/remove non-manual items
    6. Return computed items + diff
    """
    # 1. Convert input
    rp_input = _schema_to_engine(body)

    # 2. Run rules
    calculations = compute_boq(radio_plan=rp_input)

    # 3. Resolve catalog
    codes = list({c.product_code for c in calculations})
    catalog = await _resolve_catalog(codes, db)

    # 4. Get existing BOQ items for this project
    result = await db.execute(
        select(ProjectBOQItem)
        .options(joinedload(ProjectBOQItem.catalog_item))
        .where(ProjectBOQItem.project_id == project_id)
    )
    old_items = {item.product_code: item for item in result.unique().scalars().all()}
    new_by_code = {c.product_code: c for c in calculations}

    changed, added, removed = [], [], []

    # 5. Upsert
    for calc in calculations:
        cat = catalog.get(calc.product_code)
        existing = old_items.get(calc.product_code)

        if existing:
            if existing.is_manual_override:
                continue  # Preserve manual overrides
            if existing.quantity != calc.quantity:
                old_qty = existing.quantity
                existing.quantity = calc.quantity
                existing.rule_applied = calc.rule
                if cat and existing.catalog_item_id != cat.id:
                    existing.catalog_item_id = cat.id
                changed.append(
                    {
                        "productCode": calc.product_code,
                        "description": cat.description if cat else calc.product_code,
                        "oldQuantity": old_qty,
                        "newQuantity": calc.quantity,
                        "rule": calc.rule,
                    }
                )
            else:
                # Link to catalog if not linked yet
                if cat and not existing.catalog_item_id:
                    existing.catalog_item_id = cat.id
        else:
            new_item = ProjectBOQItem(
                project_id=project_id,
                catalog_item_id=cat.id if cat else None,
                product_code=calc.product_code,
                quantity=calc.quantity,
                rule_applied=calc.rule,
                is_manual_override=False,
            )
            db.add(new_item)
            added.append(
                {
                    "productCode": calc.product_code,
                    "description": cat.description if cat else calc.product_code,
                    "oldQuantity": 0,
                    "newQuantity": calc.quantity,
                    "rule": calc.rule,
                }
            )

    # Remove items no longer produced by rules (unless manual)
    for code, item in old_items.items():
        if code not in new_by_code and not item.is_manual_override:
            removed.append(
                {
                    "productCode": code,
                    "description": "",
                    "oldQuantity": item.quantity,
                    "newQuantity": 0,
                    "rule": "",
                }
            )
            await db.delete(item)

    await db.commit()

    # 6. Build response
    response_items = [_calc_to_response(c, catalog) for c in calculations]

    return {
        "items": response_items,
        "diff": {
            "changed": changed,
            "added": added,
            "removed": removed,
        },
    }
