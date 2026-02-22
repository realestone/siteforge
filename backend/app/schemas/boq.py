import uuid

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.models.catalog import CatalogSection


class BOQItemResponse(BaseModel):
    """Project BOQ item with catalog data resolved.

    The catalog fields (description, ordering_hints, etc.) are pulled from
    the joined catalog_item relationship, so the frontend gets everything
    in one payload without needing a separate catalog lookup.
    """

    id: uuid.UUID
    catalog_item_id: uuid.UUID | None = Field(None, alias="catalogItemId")
    section: CatalogSection | None = None

    # Catalog fields (resolved from join)
    product_code: str = Field(alias="productCode")
    description: str = ""
    comments: str | None = None
    ordering_hints: str | None = Field(None, alias="orderingHints")
    product_category: str = Field("", alias="productCategory")
    product_subcategory: str | None = Field(None, alias="productSubcategory")
    vendor: str | None = None

    # Per-project fields
    quantity: float = 0.0
    rule_applied: str | None = Field(None, alias="ruleApplied")
    is_manual_override: bool = Field(False, alias="isManualOverride")
    override_note: str | None = Field(None, alias="overrideNote")

    # As-built actuals
    actual_quantity: float | None = Field(None, alias="actualQuantity")
    actual_comment: str | None = Field(None, alias="actualComment")

    # Excel anchor (for frontend to know the row position)
    row_index: int | None = Field(None, alias="rowIndex")
    sheet_name: str | None = Field(None, alias="sheetName")

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    @model_validator(mode="before")
    @classmethod
    def resolve_catalog_fields(cls, data):
        """Pull catalog fields from the joined catalog_item relationship."""
        # When coming from SQLAlchemy ORM object
        if hasattr(data, "catalog_item") and data.catalog_item is not None:
            cat = data.catalog_item
            return {
                "id": data.id,
                "catalog_item_id": data.catalog_item_id,
                "section": cat.section,
                "product_code": data.product_code or cat.product_code,
                "description": cat.description,
                "comments": cat.comments,
                "ordering_hints": cat.ordering_hints,
                "product_category": cat.product_category,
                "product_subcategory": cat.product_subcategory,
                "vendor": cat.vendor,
                "quantity": data.quantity,
                "rule_applied": data.rule_applied,
                "is_manual_override": data.is_manual_override,
                "override_note": data.override_note,
                "actual_quantity": data.actual_quantity,
                "actual_comment": data.actual_comment,
                "row_index": cat.row_index,
                "sheet_name": cat.sheet_name,
            }
        # When catalog_item is None (custom item not in catalog)
        if hasattr(data, "product_code"):
            return {
                "id": data.id,
                "catalog_item_id": data.catalog_item_id,
                "section": None,
                "product_code": data.product_code,
                "description": "",
                "comments": None,
                "ordering_hints": None,
                "product_category": "",
                "product_subcategory": None,
                "vendor": None,
                "quantity": data.quantity,
                "rule_applied": data.rule_applied,
                "is_manual_override": data.is_manual_override,
                "override_note": data.override_note,
                "actual_quantity": data.actual_quantity,
                "actual_comment": data.actual_comment,
                "row_index": None,
                "sheet_name": None,
            }
        # Dict input (e.g. from API tests)
        return data


class BOQItemUpdate(BaseModel):
    """Update quantity or actuals on a project BOQ item."""

    quantity: float | None = None
    is_manual_override: bool = True
    override_note: str | None = None
    actual_quantity: float | None = None
    actual_comment: str | None = None


class BOQItemAdd(BaseModel):
    """Add a catalog item to a project's BOQ."""

    catalog_item_id: uuid.UUID = Field(alias="catalogItemId")
    quantity: float = 0.0
    override_note: str | None = Field(None, alias="overrideNote")

    model_config = ConfigDict(populate_by_name=True)


class BOQDiffItem(BaseModel):
    product_code: str = Field(alias="productCode")
    description: str = ""
    old_quantity: float = Field(alias="oldQuantity")
    new_quantity: float = Field(alias="newQuantity")
    rule: str | None = None

    model_config = ConfigDict(populate_by_name=True)


class BOQDiffResponse(BaseModel):
    changed: list[BOQDiffItem]
    added: list[BOQDiffItem]
    removed: list[BOQDiffItem]


class TSSRUpdateResult(BaseModel):
    tssr: dict
    boq_items: list[BOQItemResponse] = Field(alias="boqItems")
    boq_diff: BOQDiffResponse = Field(alias="boqDiff")
    validation: list[dict]

    model_config = ConfigDict(populate_by_name=True)


# ── Radio Plan compute schemas ───────────────────────────────────────


class RadioPlanCellInput(BaseModel):
    """A single cell row from the parsed radio plan."""

    cell_id: str = Field("", alias="cellId")
    technology: str = ""
    antenna_type: str = Field("", alias="antennaType")
    m_tilt: float | None = Field(None, alias="mTilt")
    e_tilt: float | None = Field(None, alias="eTilt")
    feed_length: float | None = Field(None, alias="feedLength")
    cable_type: str = Field("", alias="cableType")
    jumpers: str = ""

    model_config = ConfigDict(populate_by_name=True)


class RadioPlanSectorInput(BaseModel):
    """A sector summary from the parsed radio plan."""

    id: str = ""
    azimuth: float = 0
    m_tilt: float = Field(0, alias="mTilt")
    e_tilt: float = Field(0, alias="eTilt")
    antennas: list[str] = []
    technologies: list[str] = []
    cells: list[RadioPlanCellInput] = []
    feed_length: float | None = Field(None, alias="feedLength")
    cable_type: str = Field("", alias="cableType")
    jumpers: str = ""

    model_config = ConfigDict(populate_by_name=True)


class DcCableRunInput(BaseModel):
    """A single DC cable run from the Effektkalkulator."""

    sector: int = 0
    band: str = ""
    length_m: float = Field(0, alias="lengthM")
    cross_section: float = Field(0, alias="crossSection")

    model_config = ConfigDict(populate_by_name=True)


class PowerCalcComputeInput(BaseModel):
    """Relevant Effektkalkulator data for BOQ rules."""

    rectifier_modules: int = Field(0, alias="rectifierModules")
    rectifier_model: str = Field("", alias="rectifierModel")
    rectifier_is_new: bool = Field(False, alias="rectifierIsNew")
    max_modules: int = Field(0, alias="maxModules")
    battery_strings: int = Field(0, alias="batteryStrings")
    dc_cables: list[DcCableRunInput] = Field([], alias="dcCables")

    model_config = ConfigDict(populate_by_name=True)


class RadioPlanComputeRequest(BaseModel):
    """Parsed radio plan sent from frontend to compute BOQ."""

    site_id: str = Field("", alias="siteId")
    project: str = ""
    config: str = ""
    total_cells: int = Field(0, alias="totalCells")
    sectors: list[RadioPlanSectorInput] = []
    raw_rows: list[RadioPlanCellInput] = Field([], alias="rawRows")
    power_calc: PowerCalcComputeInput | None = Field(None, alias="powerCalc")

    model_config = ConfigDict(populate_by_name=True)


class ComputedBOQItem(BaseModel):
    """A single computed BOQ item with catalog data resolved."""

    product_code: str = Field(alias="productCode")
    description: str = ""
    quantity: float = 0
    section: str = "product"
    product_category: str = Field("", alias="productCategory")
    product_subcategory: str | None = Field(None, alias="productSubcategory")
    vendor: str | None = None
    rule_applied: str = Field("", alias="ruleApplied")
    row_index: int | None = Field(None, alias="rowIndex")
    sheet_name: str | None = Field(None, alias="sheetName")
    in_catalog: bool = Field(True, alias="inCatalog")

    model_config = ConfigDict(populate_by_name=True)


class BOQComputeResponse(BaseModel):
    """Response from the compute endpoint."""

    items: list[ComputedBOQItem]
    diff: BOQDiffResponse

    model_config = ConfigDict(populate_by_name=True)
