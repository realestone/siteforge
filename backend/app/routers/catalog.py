import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.catalog import BOQCatalogItem, CatalogSection
from app.schemas.catalog import CatalogItemResponse, CatalogStatsResponse

router = APIRouter(prefix="/api/catalog", tags=["catalog"])


@router.get("/search", response_model=list[CatalogItemResponse])
async def search_catalog(
    q: str | None = Query(
        None, description="Search product code, description, or hints"
    ),
    section: CatalogSection | None = Query(None, description="Filter by section"),
    category: str | None = Query(None, description="Filter by product category"),
    vendor: str | None = Query(None, description="Filter by vendor"),
    limit: int = Query(50, le=200),
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
):
    """Search the full catalog across all sections.

    Examples:
        /api/catalog/search?q=AQQY
        /api/catalog/search?q=antenna&section=product
        /api/catalog/search?section=griptel&category=Steel
        /api/catalog/search?vendor=Nokia&limit=100
    """
    stmt = select(BOQCatalogItem)

    if q:
        pattern = f"%{q}%"
        stmt = stmt.where(
            or_(
                BOQCatalogItem.product_code.ilike(pattern),
                BOQCatalogItem.description.ilike(pattern),
                BOQCatalogItem.ordering_hints.ilike(pattern),
                BOQCatalogItem.product_category.ilike(pattern),
                BOQCatalogItem.product_subcategory.ilike(pattern),
            )
        )

    if section:
        stmt = stmt.where(BOQCatalogItem.section == section)

    if category:
        stmt = stmt.where(BOQCatalogItem.product_category == category)

    if vendor:
        stmt = stmt.where(BOQCatalogItem.vendor == vendor)

    stmt = stmt.order_by(BOQCatalogItem.sheet_name, BOQCatalogItem.row_index)
    stmt = stmt.offset(offset).limit(limit)

    result = await db.execute(stmt)
    return result.scalars().all()


@router.get("/stats", response_model=CatalogStatsResponse)
async def catalog_stats(db: AsyncSession = Depends(get_db)):
    """Get summary counts and available filter values."""
    # Section counts
    section_counts = {}
    for sec in CatalogSection:
        result = await db.execute(
            select(func.count(BOQCatalogItem.id)).where(BOQCatalogItem.section == sec)
        )
        section_counts[sec.value] = result.scalar() or 0

    total = sum(section_counts.values())

    # Unique categories
    cat_result = await db.execute(
        select(BOQCatalogItem.product_category)
        .where(BOQCatalogItem.product_category != "")
        .distinct()
        .order_by(BOQCatalogItem.product_category)
    )
    categories = [r[0] for r in cat_result.all()]

    # Unique vendors
    vendor_result = await db.execute(
        select(BOQCatalogItem.vendor)
        .where(BOQCatalogItem.vendor.is_not(None))
        .distinct()
        .order_by(BOQCatalogItem.vendor)
    )
    vendors = [r[0] for r in vendor_result.all()]

    return CatalogStatsResponse(
        total=total,
        products=section_counts.get("product", 0),
        services=section_counts.get("service", 0),
        griptel=section_counts.get("griptel", 0),
        solar=section_counts.get("solar", 0),
        categories=categories,
        vendors=vendors,
    )


@router.get("/{item_id}", response_model=CatalogItemResponse)
async def get_catalog_item(item_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    """Get a single catalog item by ID."""
    result = await db.execute(
        select(BOQCatalogItem).where(BOQCatalogItem.id == item_id)
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(404, "Catalog item not found")
    return item
