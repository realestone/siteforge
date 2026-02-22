"""Dependency engine: maps parsed Radio Plan data to BOQ product codes + quantities.

Each rule takes RadioPlanInput and returns zero or more BOQCalculation results.
Product codes match the real 782-row catalog in boq_catalog.
The caller (boq_service) resolves codes against the catalog for descriptions,
row_index, sheet_name, vendor, etc.

Config string format: [N]<sector_sizes>_
  N = New site (optional prefix — fresh install, not upgrade/swap)
  L = Large sector (NR + LTE + mMIMO AQQY)
  M = Medium sector (LTE + NR, no mMIMO)
  S = Small sector (LTE only)
  _ = terminator

Examples:
  NLLL_ = New site, 3 Large sectors
  NLL_  = New site, 2 Large sectors
  NM_   = New site, 1 Medium sector
  LLL_  = Existing site upgrade, 3 Large sectors
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Callable

from app.services.config_utils import parse_config

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
class DcCableRun:
    """A single DC cable run from the Effektkalkulator."""

    sector: int = 0
    band: str = ""
    length_m: float = 0
    cross_section: float = 0  # mm²


@dataclass
class PowerCalcInput:
    """Parsed Effektkalkulator data relevant to BOQ rules."""

    rectifier_modules: int = 0
    rectifier_model: str = ""
    rectifier_is_new: bool = False
    max_modules: int = 0
    battery_strings: int = 0  # from Effektkalkulator B39 (2h backup)
    dc_cables: list[DcCableRun] = field(default_factory=list)


@dataclass
class BOQCalculation:
    """A single computed BOQ line: product_code + quantity + rule explanation."""

    product_code: str
    quantity: float
    rule: str
    section: str = "product"  # product | service | griptel | solar
    category: str = "System module"  # for items not found in catalog


# ── Config setup computation ─────────────────────────────────────────
# Formula-based: computes quantities from parsed config sector sizes.
#
# Per-site (fixed):
#   ABIO ×2, ASIB ×1, AMIA ×1 — BBU modules for any new site
#
# Per-sector by size:
#   L (Large):  AHEGB ×1, AHPMDB ×1, AQQY ×1, AOPC ×4
#   M (Medium): AHEGB ×1, AHPMDB ×1, AOPC ×2 (no AQQY)
#   S (Small):  AHEGB ×1, AOPC ×1 (LTE only, single RRH)


@dataclass
class ConfigItem:
    product_code: str
    quantity: float
    subcategory: str = ""


def compute_setup_items(config: str) -> list[ConfigItem]:
    """Compute hardware modules needed for a config string."""
    parsed = parse_config(config)
    if not parsed.is_new:
        return []

    items: list[ConfigItem] = [
        # Per-site BBU modules
        ConfigItem("475266B.102", 2, "ABIO"),
        ConfigItem("473764A.102", 1, "ASIB"),
        ConfigItem("473098A.205", 1, "AMIA"),
    ]

    # AHEGB: 1 per L/M/S sector (all sectors get at least the LB RRH)
    ahegb_count = parsed.large_count + parsed.medium_count + parsed.small_count
    if ahegb_count > 0:
        items.append(ConfigItem("474090A.101", ahegb_count, "AHEGB"))

    # AHPMDB: 1 per L/M sector (HB RRH, not needed for S)
    ahpmdb_count = parsed.large_count + parsed.medium_count
    if ahpmdb_count > 0:
        items.append(ConfigItem("475000A.101", ahpmdb_count, "AHPMDB"))

    # AQQY: 1 per L sector only (mMIMO)
    if parsed.large_count > 0:
        items.append(ConfigItem("475573A.103", parsed.large_count, "AQQY"))

    # AOPC: 4 per L, 2 per M, 1 per S (SFP weatherproofing boot kits)
    aopc_count = (
        parsed.large_count * 4 + parsed.medium_count * 2 + parsed.small_count * 1
    )
    if aopc_count > 0:
        items.append(ConfigItem("475151A.102", aopc_count, "AOPC"))

    return items


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
    items = compute_setup_items(rp.config)
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


def rule_jumpers(rp: RadioPlanInput) -> list[BOQCalculation]:
    """SLJ12SP jumper cables — product code derived from jumper length in radio plan.

    Counts per raw row (cell), each row = 1 pair (2 jumpers).
    E.g. 8 rows with "6 m" → SLJ12SP-64M64M-6.0m qty=16.
    """
    jumper_count: dict[str, int] = {}
    for cell in rp.raw_rows:
        if not cell.jumpers:
            continue
        match = re.match(r"(\d+(?:\.\d+)?)\s*m", cell.jumpers.strip())
        if not match:
            continue
        length = match.group(1)
        # Normalize: "6" -> "6.0", "5" -> "5.0"
        if "." not in length:
            length = f"{length}.0"
        code = f"SLJ12SP-64M64M-{length}m"
        jumper_count[code] = jumper_count.get(code, 0) + 2  # pair per row
    return [
        BOQCalculation(
            product_code=code,
            quantity=qty,
            rule=f"Radio plan jumper: {qty} pcs ({qty // 2} rows x 2)",
            section="product",
            category="System module",
        )
        for code, qty in jumper_count.items()
    ]


# Antenna types that require a downtilt kit when mTilt != 0
DOWNTILT_ANTENNAS = {"RRZZ-65B-R4N39-V1", "RRZZ-65B-R4N39"}


def rule_downtilt_kit(rp: RadioPlanInput) -> list[BOQCalculation]:
    """BSA-DT-34 downtilt kit — for sectors with RRZZ-V1 antenna AND mTilt != 0.

    Only ordered when the antenna is exactly RRZZ-65B-R4N39-V1 or RRZZ-65B-R4N39
    and the sector has any non-zero mechanical tilt (positive or negative).
    V3 (High Gain) does NOT require a downtilt kit.
    """
    count = 0
    for s in rp.sectors:
        if s.m_tilt is None or s.m_tilt == 0:
            continue
        has_rrzz = any(ant in DOWNTILT_ANTENNAS for ant in s.antennas)
        if has_rrzz:
            count += 1
    if count == 0:
        return []
    return [
        BOQCalculation(
            product_code="BSA-DT-34",
            quantity=count,
            rule=f"RRZZ antenna + mech tilt != 0: {count} sectors",
            section="product",
            category="System module",
        )
    ]


def rule_bbu_install(rp: RadioPlanInput) -> list[BOQCalculation]:
    """ice_RM_002 — System module installation (BBU). Always 1 for any new site."""
    parsed = parse_config(rp.config)
    if not parsed.is_new:
        return []
    return [
        BOQCalculation(
            product_code="ice_RM_002",
            quantity=1,
            rule=f"New site config: {rp.config}",
            section="service",
            category="Service items",
        )
    ]


def rule_rrh_install(rp: RadioPlanInput) -> list[BOQCalculation]:
    """ice_RM_003 — RRH/RRU installation.
    AHEGB: 1 per sector (L+M+S), AHPMDB: 1 per L/M sector.
    """
    parsed = parse_config(rp.config)
    if not parsed.is_new:
        return []
    # AHEGB count = all sectors, AHPMDB count = L+M sectors
    rrh_count = (
        parsed.large_count
        + parsed.medium_count
        + parsed.small_count  # AHEGB
        + parsed.large_count
        + parsed.medium_count  # AHPMDB
    )
    if rrh_count == 0:
        return []
    return [
        BOQCalculation(
            product_code="ice_RM_003",
            quantity=rrh_count,
            rule=f"RRH units: {int(rrh_count)} (new site)",
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


def rule_stickers(rp: RadioPlanInput) -> list[BOQCalculation]:
    """ice_stickers_small — ICE equipment stickers. Always 1 for all sites."""
    return [
        BOQCalculation(
            product_code="ice_stickers_small",
            quantity=1,
            rule="Default: all sites",
            section="service",
            category="Service items",
        )
    ]


def rule_commissioning(rp: RadioPlanInput) -> list[BOQCalculation]:
    """ice_RM_016 — Commissioning eNB/gNB. Always 1 for all sites."""
    return [
        BOQCalculation(
            product_code="ice_RM_016",
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
    """GPS kit + installation — only for Large config (3+ L characters in config)."""
    l_count = rp.config.count("L")
    if l_count < 3:
        return []
    items = [
        BOQCalculation(
            product_code=item.product_code,
            quantity=item.quantity,
            rule="Large config GPS kit",
            section="product",
            category="System module",
        )
        for item in GPS_KIT_ITEMS
    ]
    # GPS antenna installation service
    items.append(
        BOQCalculation(
            product_code="ice_ant_010",
            quantity=1,
            rule="Large config GPS installation",
            section="service",
            category="Service items",
        )
    )
    return items


def rule_sfp_modules(rp: RadioPlanInput) -> list[BOQCalculation]:
    """475336A.101 — AOME 10G SFP+ 850nm 300m MM I-temp.

    2 SFPs per radio, 2 radios per M/L sector (AHEGB + AHPMDB).
    Qty = (M + L sector count) × 2 radios × 2 SFPs.
    S sectors don't need SFPs. Always ordered regardless of new/existing.
    """
    parsed = parse_config(rp.config)
    ml_count = parsed.large_count + parsed.medium_count
    if ml_count == 0:
        return []
    qty = ml_count * 2 * 2  # 2 radios × 2 SFPs per sector
    return [
        BOQCalculation(
            product_code="475336A.101",
            quantity=qty,
            rule=f"{ml_count} M/L sectors × 2 radios × 2 SFPs = {qty}",
            section="product",
            category="System module",
        )
    ]


def rule_appc_dc_plug(rp: RadioPlanInput) -> list[BOQCalculation]:
    """474283A.101 — APPC Airscale2 55A DC plug 10-16mm2.

    1 per radio/AQQY: L sector = 3 (2 RRHs + AQQY), M sector = 2 (2 RRHs), S = 0.
    """
    parsed = parse_config(rp.config)
    qty = parsed.large_count * 3 + parsed.medium_count * 2
    if qty == 0:
        return []
    return [
        BOQCalculation(
            product_code="474283A.101",
            quantity=qty,
            rule=f"{parsed.large_count}L×3 + {parsed.medium_count}M×2 = {qty}",
            section="product",
            category="System module",
        )
    ]


def rule_atoa_set(rp: RadioPlanInput) -> list[BOQCalculation]:
    """ATOA optical distribution unit set — for rooftop sites.

    Includes ATOA unit, AMRA/AMRB clip brackets, and FTTA box installation.
    Default qty 2 each — may need manual adjustment per site.
    NOTE: Currently fires for all sites; site category filtering requires
    TSSR data which isn't available in radio plan rules yet.
    """
    return [
        BOQCalculation(
            product_code="475163A.101",
            quantity=2,
            rule="Rooftop default: 2 pcs (adjust per site)",
            section="product",
            category="System module",
        ),
        BOQCalculation(
            product_code="474580A.101",
            quantity=2,
            rule="ATOA clip rail bracket: 2 pcs",
            section="product",
            category="System module",
        ),
        BOQCalculation(
            product_code="ice_RM_014",
            quantity=2,
            rule="ATOA installation: 2 pcs",
            section="service",
            category="Service items",
        ),
    ]


def rule_amrb_bracket(rp: RadioPlanInput) -> list[BOQCalculation]:
    """474581A.102 — AMRB AirScale one clip bracket.

    1 per RRH: L sector = 2 (AHEGB + AHPMDB), M sector = 2, S = 0.
    """
    parsed = parse_config(rp.config)
    ml_count = parsed.large_count + parsed.medium_count
    qty = ml_count * 2
    if qty == 0:
        return []
    return [
        BOQCalculation(
            product_code="474581A.102",
            quantity=qty,
            rule=f"{ml_count} M/L sectors × 2 RRHs = {qty}",
            section="product",
            category="System module",
        )
    ]


def rule_ampf_bracket(rp: RadioPlanInput) -> list[BOQCalculation]:
    """475188A.102 — AMPF bracket 20 degree tilt.

    1 per AQQY (mMIMO), Large sectors only. Always ordered even if mech tilt is zero.
    """
    parsed = parse_config(rp.config)
    if parsed.large_count == 0:
        return []
    return [
        BOQCalculation(
            product_code="475188A.102",
            quantity=parsed.large_count,
            rule=f"{parsed.large_count} Large sectors × 1 per AQQY = {parsed.large_count}",
            section="product",
            category="System module",
        )
    ]


def rule_sfp28_modules(rp: RadioPlanInput) -> list[BOQCalculation]:
    """474900A.101 — AOMC SFP28 70m MM I-temp RS.

    4 SFPs per AQQY (mMIMO), 1 AQQY per Large sector only.
    Qty = L sector count × 4. Medium/Small sectors have no AQQY.
    """
    parsed = parse_config(rp.config)
    if parsed.large_count == 0:
        return []
    qty = parsed.large_count * 4
    return [
        BOQCalculation(
            product_code="474900A.101",
            quantity=qty,
            rule=f"{parsed.large_count} Large sectors × 4 SFPs per AQQY = {qty}",
            section="product",
            category="System module",
        )
    ]


# ── Rule registry ────────────────────────────────────────────────────

ALL_RULES: list[Callable[[RadioPlanInput], list[BOQCalculation]]] = [
    rule_site_setup,
    rule_antenna,
    rule_jumpers,
    rule_downtilt_kit,
    rule_bbu_install,
    rule_rrh_install,
    rule_walk_test,
    rule_tss_report,
    rule_labeling,
    rule_stickers,
    rule_commissioning,
    rule_cable_feeder,
    rule_travel,
    rule_gps_kit,
    rule_sfp_modules,
    rule_sfp28_modules,
    rule_appc_dc_plug,
    rule_amrb_bracket,
    rule_ampf_bracket,
    rule_atoa_set,
]


def rule_rectifier_modules(pc: PowerCalcInput) -> list[BOQCalculation]:
    """Rectifier modules + installation for new rectifier.

    New rectifier comes with 3 modules pre-installed.
    If more than 3 needed, order extra modules (241115.106 FLATPACK2)
    and their installation service (ice_DC_Service_005).
    """
    if not pc.rectifier_is_new or pc.rectifier_modules <= 0:
        return []
    extra = pc.rectifier_modules - 3
    if extra <= 0:
        return []
    results = [
        BOQCalculation(
            product_code="241115.106",
            quantity=extra,
            rule=f"Effektkalkulator: {pc.rectifier_modules} modules - 3 pre-installed = {extra} ({pc.rectifier_model})",
            section="product",
            category="System module",
        ),
        BOQCalculation(
            product_code="ice_DC_Service_005",
            quantity=extra,
            rule=f"Effektkalkulator: {extra} extra module installations ({pc.rectifier_model})",
            section="service",
            category="Service items",
        ),
    ]
    return results


# Per-run cable overhead by cross-section (meters added for slack/termination)
CABLE_OVERHEAD: dict[int, int] = {10: 3, 16: 5, 25: 5, 35: 5, 50: 5}

# Cable product codes by cross-section
CABLE_PRODUCT: dict[int, str] = {
    10: "SL2C10MM2FRNC-S-BK-N",
    16: "SL2C16MM2FRNC-S-BK-N",
}

# Installation service codes by cross-section
CABLE_INSTALL: dict[int, str] = {
    10: "ice_cable_007",
    16: "ice_cable_008",
}


def rule_dc_cables(pc: PowerCalcInput) -> list[BOQCalculation]:
    """DC cable products + installation services from Effektkalkulator cable table.

    Cable product qty = sum of (run length + overhead) per cross-section.
    Installation service qty = sum of raw run lengths per cross-section.
    """
    if not pc.dc_cables:
        return []

    # Group runs by cross-section
    runs_by_cs: dict[int, list[float]] = {}
    for cable in pc.dc_cables:
        cs = int(cable.cross_section)
        if cs not in runs_by_cs:
            runs_by_cs[cs] = []
        runs_by_cs[cs].append(cable.length_m)

    results: list[BOQCalculation] = []
    for cs, lengths in sorted(runs_by_cs.items()):
        overhead = CABLE_OVERHEAD.get(cs, 3)
        raw_total = sum(lengths)
        order_total = sum(l + overhead for l in lengths)
        run_count = len(lengths)

        # Cable product
        product_code = CABLE_PRODUCT.get(cs)
        if product_code:
            results.append(
                BOQCalculation(
                    product_code=product_code,
                    quantity=order_total,
                    rule=f"DC cables {cs}mm²: {run_count} runs, {int(raw_total)}m + {overhead}m/run = {int(order_total)}m",
                    section="product",
                    category="System module",
                )
            )

        # Installation service
        install_code = CABLE_INSTALL.get(cs)
        if install_code:
            results.append(
                BOQCalculation(
                    product_code=install_code,
                    quantity=raw_total,
                    rule=f"DC cable install {cs}mm²: {run_count} runs, {int(raw_total)}m total",
                    section="service",
                    category="Service items",
                )
            )

    return results


def rule_batteries(pc: PowerCalcInput) -> list[BOQCalculation]:
    """M12V190FT — MARATHON 12V 190AH batteries.

    1 string = 4 battery blocks. Qty = battery_strings × 4.
    Only when new rectifier (new battery setup).
    """
    if not pc.rectifier_is_new or pc.battery_strings <= 0:
        return []
    qty = pc.battery_strings * 4
    return [
        BOQCalculation(
            product_code="M12V190FT",
            quantity=qty,
            rule=f"{pc.battery_strings} strings × 4 batteries = {qty}",
            section="product",
            category="System module",
        )
    ]


def rule_battery_connect_set(pc: PowerCalcInput) -> list[BOQCalculation]:
    """MT_BATT_CONNECT_SET — Battery connection set MARATHON.

    1 per battery string, only when new rectifier.
    """
    if not pc.rectifier_is_new or pc.battery_strings <= 0:
        return []
    return [
        BOQCalculation(
            product_code="MT_BATT_CONNECT_SET",
            quantity=pc.battery_strings,
            rule=f"{pc.battery_strings} battery strings, 1 connection set each",
            section="product",
            category="System module",
        )
    ]


def rule_asal_cable(pc: PowerCalcInput) -> list[BOQCalculation]:
    """476359A.101 — ASAL EAC cable 19PIN - peeled end 10m.

    Always 1 when new rectifier is being installed.
    """
    if not pc.rectifier_is_new:
        return []
    return [
        BOQCalculation(
            product_code="476359A.101",
            quantity=1,
            rule="New rectifier: 1 EAC cable",
            section="product",
            category="System module",
        )
    ]


POWER_CALC_RULES: list[Callable[[PowerCalcInput], list[BOQCalculation]]] = [
    rule_rectifier_modules,
    rule_dc_cables,
    rule_batteries,
    rule_battery_connect_set,
    rule_asal_cable,
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

    if power_calc:
        for rule_fn in POWER_CALC_RULES:
            results.extend(rule_fn(power_calc))

    return results
