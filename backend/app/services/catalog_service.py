"""Catalog query helpers."""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.catalog import BOQCatalogItem


async def get_all_items(db: AsyncSession) -> list[BOQCatalogItem]:
    result = await db.execute(
        select(BOQCatalogItem).order_by(BOQCatalogItem.row_index)
    )
    return list(result.scalars().all())


async def find_by_product_code(db: AsyncSession, code: str) -> BOQCatalogItem | None:
    result = await db.execute(
        select(BOQCatalogItem).where(BOQCatalogItem.product_code == code)
    )
    return result.scalar_one_or_none()
