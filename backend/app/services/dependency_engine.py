"""Dependency engine: maps parsed Radio Plan data to BOQ product codes + quantities.

Each rule takes RadioPlanInput and returns zero or more BOQCalculation results.
Product codes match the real 782-row catalog in boq_catalog.
The caller (boq_service) resolves codes against the catalog for descriptions,
row_index, sheet_name, vendor, etc.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Callable

# ── Input types ──────────────────────────────────────────────────────


@dataclass
class RadioPlanCell:
    cell_id: str = ""
    technology: str = ""
    antenna_type: str = ""
    m_tilt: float | None = None
    e_tilt: float | None = None
    feed_length: float | None = None
    cable_type: str = ""
    jumpers: str = ""


@dataclass
class RadioPlanSector:
    id: str = ""
    azimuth: float = 0
    m_tilt: float = 0
    e_tilt: float = 0
    antennas: list[str] = field(default_factory=list)
    technologies: list[str] = field(default_factory=list)
    cells: list[RadioPlanCell] = field(default_factory=list)
    feed_length: float | None = None
    cable_type: str = ""
    jumpers: str = ""


@dataclass
class RadioPlanInput:
    site_id: str = ""
    project: str = ""
    config: str = ""
    total_cells: int = 0
    sectors: list[RadioPlanSector] = field(default_factory=list)
    raw_rows: list[RadioPlanCell] = field(default_factory=list)


@dataclass
class PowerCalcInput:
    """Placeholder for Effektkalkulator data — rules will be added later."""

    pass


@dataclass
class BOQCalculation:
    """A single computed BOQ line: product_code + quantity + rule explanation."""

    product_code: str
    quantity: float
    rule: str
    section: str = "product"  # product | service | griptel | solar
    category: str = "System module"  # for items not found in catalog


# ── Config setup tables ──────────────────────────────────────────────
# Maps config string → list of (product_code, quantity).
# Descriptions come from the catalog at resolution time.


@dataclass
class ConfigItem:
    product_code: str
    quantity: float
    subcategory: str = ""


NLLL_SETUP_ITEMS: list[ConfigItem] = [
    # System modules (BBU)
    ConfigItem("475266B.102", 2, "ABIO"),
    ConfigItem("473764A.102", 1, "ASIB"),
    ConfigItem("473098A.205", 1, "AMIA"),
    # RRH per sector
    ConfigItem("474090A.101", 3, "AHEGB"),
    ConfigItem("475000A.101", 3, "AHPMDB"),
    ConfigItem("475573A.103", 3, "AQQY"),
    # Accessories
    ConfigItem("475151A.102", 12, "AOPC"),
    ConfigItem("474283A.101", 9, "APPC"),
]

CONFIG_SETUP_MAP: dict[str, list[ConfigItem]] = {
    "NLLL_": NLLL_SETUP_ITEMS,
}

# Site ID prefix → region code
SITE_PREFIX_TO_REGION: dict[str, str] = {
    "MOR": "04",
}

# GPS kit items — only for Large config (3+ L sectors)
GPS_KIT_ITEMS: list[ConfigItem] = [
    ConfigItem("471605A.102", 1, "FYMA"),
    ConfigItem("472577A.103", 1, "FTSH"),
    ConfigItem("475647A.101", 1, "AYGE"),
    ConfigItem("471812A.105", 1, "FYEA"),
]


# ── Individual rules ─────────────────────────────────────────────────


def rule_site_setup(rp: RadioPlanInput) -> list[BOQCalculation]:
    """Config-driven hardware: ABIO, ASIB, AMIA, RRHs, accessories."""
    items = CONFIG_SETUP_MAP.get(rp.config)
    if not items:
        return []
    return [
        BOQCalculation(
            product_code=item.product_code,
            quantity=item.quantity,
            rule=f"Config: {rp.config}",
            section="product",
            category="System module",
        )
        for item in items
    ]


def rule_antenna(rp: RadioPlanInput) -> list[BOQCalculation]:
    """Antenna from radio plan — product code = antennaType from parsed data."""
    antenna_count: dict[str, int] = {}
    for sector in rp.sectors:
        for ant in sector.antennas:
            if ant:
                antenna_count[ant] = antenna_count.get(ant, 0) + 1
    return [
        BOQCalculation(
            product_code=antenna,
            quantity=qty,
            rule=f"Radio plan antenna: {qty} sectors",
            section="product",
            category="System module",
        )
        for antenna, qty in antenna_count.items()
    ]


def rule_downtilt_kit(rp: RadioPlanInput) -> list[BOQCalculation]:
    """BSA-DT-34 downtilt kit — one per sector with mechanical tilt > 0."""
    sectors_with_mtilt = sum(
        1 for s in rp.sectors if s.m_tilt is not None and s.m_tilt > 0
    )
    if sectors_with_mtilt == 0:
        return []
    return [
        BOQCalculation(
            product_code="BSA-DT-34",
            quantity=sectors_with_mtilt,
            rule=f"Sectors with mech tilt > 0: {sectors_with_mtilt}",
            section="product",
            category="System module",
        )
    ]


def rule_bbu_install(rp: RadioPlanInput) -> list[BOQCalculation]:
    """ice_RM_002 — System module installation (BBU). Always 1 for NLLL_."""
    if rp.config != "NLLL_":
        return []
    return [
        BOQCalculation(
            product_code="ice_RM_002",
            quantity=1,
            rule=f"Config: {rp.config}",
            section="service",
            category="Service items",
        )
    ]


def rule_rrh_install(rp: RadioPlanInput) -> list[BOQCalculation]:
    """ice_RM_003 — RRH/RRU installation. Count of RRH units in config."""
    if rp.config != "NLLL_":
        return []
    rrh_count = sum(
        item.quantity
        for item in NLLL_SETUP_ITEMS
        if item.subcategory in ("AHEGB", "AHPMDB")
    )
    if rrh_count == 0:
        return []
    return [
        BOQCalculation(
            product_code="ice_RM_003",
            quantity=rrh_count,
            rule=f"RRH units: {int(rrh_count)}",
            section="service",
            category="Service items",
        )
    ]


def rule_walk_test(rp: RadioPlanInput) -> list[BOQCalculation]:
    """ice_PM_004 — Walk test, 2 frequency per sector. Qty = LTE cell count."""
    lte_count = sum(1 for c in rp.raw_rows if c.technology == "LTE")
    if lte_count == 0:
        return []
    return [
        BOQCalculation(
            product_code="ice_PM_004",
            quantity=lte_count,
            rule=f"LTE cells: {lte_count}",
            section="service",
            category="Service items",
        )
    ]


def rule_tss_report(rp: RadioPlanInput) -> list[BOQCalculation]:
    """ice_TSS_001 — TSS report on new RT site. For any new site (config starts with N)."""
    if not rp.config.startswith("N"):
        return []
    return [
        BOQCalculation(
            product_code="ice_TSS_001",
            quantity=1,
            rule=f"New site: {rp.config}",
            section="service",
            category="Service items",
        )
    ]


def rule_labeling(rp: RadioPlanInput) -> list[BOQCalculation]:
    """ice_Basic_M_001 — Labeling. Always 1 for all sites."""
    return [
        BOQCalculation(
            product_code="ice_Basic_M_001",
            quantity=1,
            rule="Default: all sites",
            section="service",
            category="Service items",
        )
    ]


def rule_cable_feeder(rp: RadioPlanInput) -> list[BOQCalculation]:
    """ice_cable_001 — 1/2\" feeder installation per meter.
    Jumpers > 5m: charge (length - 5) * 2 per jumper.
    """
    total = 0.0
    for sector in rp.sectors:
        jumper_str = sector.jumpers
        if not jumper_str:
            continue
        # Parse "6 m" or "6m" patterns
        matches = re.findall(r"(\d+(?:\.\d+)?)\s*m", jumper_str)
        for m in matches:
            length = float(m)
            if length > 5:
                total += (length - 5) * 2
    if total <= 0:
        return []
    return [
        BOQCalculation(
            product_code="ice_cable_001",
            quantity=total,
            rule=f"Jumpers > 5m excess: {total}",
            section="service",
            category="Service items",
        )
    ]


def rule_travel(rp: RadioPlanInput) -> list[BOQCalculation]:
    """Travel rules — region derived from site ID prefix."""
    prefix = rp.site_id[:3].upper() if len(rp.site_id) >= 3 else ""
    region = SITE_PREFIX_TO_REGION.get(prefix)
    if not region:
        return []
    return [
        BOQCalculation(
            product_code="ice_T&T_004",
            quantity=1,
            rule=f"Travel 1 man, region {region}",
            section="service",
            category="Service items",
        ),
        BOQCalculation(
            product_code="ice_T&T_009",
            quantity=11,
            rule=f"Travel team, region {region}",
            section="service",
            category="Service items",
        ),
    ]


def rule_gps_kit(rp: RadioPlanInput) -> list[BOQCalculation]:
    """GPS kit — only for Large config (3+ L characters in config)."""
    l_count = rp.config.count("L")
    if l_count < 3:
        return []
    return [
        BOQCalculation(
            product_code=item.product_code,
            quantity=item.quantity,
            rule="Large config GPS kit",
            section="product",
            category="System module",
        )
        for item in GPS_KIT_ITEMS
    ]


# ── Rule registry ────────────────────────────────────────────────────

ALL_RULES: list[Callable[[RadioPlanInput], list[BOQCalculation]]] = [
    rule_site_setup,
    rule_antenna,
    rule_downtilt_kit,
    rule_bbu_install,
    rule_rrh_install,
    rule_walk_test,
    rule_tss_report,
    rule_labeling,
    rule_cable_feeder,
    rule_travel,
    rule_gps_kit,
]


def compute_boq(
    radio_plan: RadioPlanInput | None = None,
    power_calc: PowerCalcInput | None = None,
) -> list[BOQCalculation]:
    """Run all rules and return flat list of BOQ calculations.

    Product codes are real catalog codes. The caller resolves them against
    the boq_catalog table for descriptions, vendor, row_index, sheet_name.
    """
    results: list[BOQCalculation] = []

    if radio_plan:
        for rule_fn in ALL_RULES:
            results.extend(rule_fn(radio_plan))

    # Power calc rules will be added here

    return results
