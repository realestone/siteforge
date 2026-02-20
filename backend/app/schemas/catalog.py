import uuid

from pydantic import BaseModel, ConfigDict, Field

from app.models.catalog import CatalogSection


class CatalogItemResponse(BaseModel):
    """Catalog item as returned to the frontend."""

    id: uuid.UUID
    section: CatalogSection
    row_index: int = Field(alias="rowIndex")
    sheet_name: str = Field(alias="sheetName")
    product_code: str = Field(alias="productCode")
    description: str
    comments: str | None = None
    ordering_hints: str | None = Field(None, alias="orderingHints")
    product_category: str = Field(alias="productCategory")
    product_subcategory: str | None = Field(None, alias="productSubcategory")
    vendor: str | None = None

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)


class CatalogSearchParams(BaseModel):
    """Query parameters for catalog search."""

    q: str | None = None
    section: CatalogSection | None = None
    category: str | None = None
    vendor: str | None = None
    limit: int = Field(50, le=200)
    offset: int = 0


class CatalogStatsResponse(BaseModel):
    """Summary counts for catalog sections."""

    total: int
    products: int
    services: int
    griptel: int
    solar: int
    categories: list[str]
    vendors: list[str]
