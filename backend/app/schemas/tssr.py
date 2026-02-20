import uuid

from pydantic import BaseModel, ConfigDict, Field


class SectorDataSchema(BaseModel):
    id: str
    azimuth: float = 0
    m_tilt: float = Field(0, alias="mTilt")
    e_tilt: float = Field(0, alias="eTilt")
    antennas: list[str] = []
    cable_route: float | None = Field(None, alias="cableRoute")

    model_config = ConfigDict(populate_by_name=True)


class RevisionEntrySchema(BaseModel):
    id: str = ""
    rev: str = ""
    nr: int = 0
    name: str = ""
    company: str = ""
    type: str = ""
    date: str = ""

    model_config = ConfigDict(populate_by_name=True)


class TSSRInput(BaseModel):
    # Site Identity
    site_id: str = Field("", alias="siteId")
    site_name: str = Field("", alias="siteName")
    operator: str = ""
    site_model: str = Field("", alias="siteModel")
    site_type: str = Field("", alias="siteType")
    customer: str = ""
    site_owner: str = Field("", alias="siteOwner")

    # Supporting Documents
    site_owner_offer: str = Field("", alias="siteOwnerOffer")
    montasjeunderlag: str = ""
    sart: str = ""
    veiviser: str = ""
    rfsr_rnp: str = Field("", alias="rfsrRnp")
    guideline_version: str = Field("", alias="guidelineVersion")

    # Access Info (extended)
    veiviser_comments: str = Field("", alias="veiviserComments")
    iloq_required: bool = Field(False, alias="iloqRequired")
    iloq_details: str = Field("", alias="iloqDetails")

    # TSSR Alignment
    tssr_alignment: str = Field("", alias="tssrAlignment")
    tssr_alignment_comments: str = Field("", alias="tssrAlignmentComments")

    # Radio Configuration
    sectors: int = 1
    size: str = "Small"
    config: str = ""
    sector_data: list[SectorDataSchema] = Field([], alias="sectorData")

    # Access & Logistics
    site_category: str = Field("Rooftop", alias="siteCategory")
    landlord_name: str = Field("", alias="landlordName")
    access_instructions: str = Field("", alias="accessInstructions")
    crane_needed: bool = Field(False, alias="craneNeeded")

    # Cabinet & Power
    cabinet_type: str = Field("Indoor", alias="cabinetType")
    acdb: str = ""
    rectifier: str = ""
    earthing: str = ""

    # HSE
    hse_hazards: list[str] = Field([], alias="hseHazards")

    # Building Info
    roof_type: str | None = Field(None, alias="roofType")
    roof_material: str | None = Field(None, alias="roofMaterial")
    roof_load: float | None = Field(None, alias="roofLoad")
    tower_height: float | None = Field(None, alias="towerHeight")

    # Cable Routing
    cable_ladder_length: float | None = Field(None, alias="cableLadderLength")
    vertical_cable_route: float | None = Field(None, alias="verticalCableRoute")

    # Antenna Mounting
    mount_type: str = Field("Gravitation", alias="mountType")

    # Services
    painting_required: bool = Field(False, alias="paintingRequired")
    painting_color: str | None = Field(None, alias="paintingColor")

    # Revision History
    revision_history: list[RevisionEntrySchema] = Field([], alias="revisionHistory")

    # Other
    additional_notes: str = Field("", alias="additionalNotes")

    model_config = ConfigDict(populate_by_name=True)


class TSSRResponse(TSSRInput):
    id: uuid.UUID
    project_id: uuid.UUID = Field(alias="projectId")

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)
