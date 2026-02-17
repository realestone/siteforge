# AGENTS.md — Domain Rules & Dependency Engine

This file contains the telecom domain knowledge needed to build the BOQ dependency engine. It is the single source of truth for how TSSR inputs map to BOQ quantities.

---

## Config String Format

The config string is the primary driver. It encodes vendor, sector count, and band configuration per sector.

```
Format: [Vendor][SectorConfigs]_

Vendor prefix:
  N = Nokia
  U = (other vendor, same pattern)

Sector config letters (one per sector):
  S = Small  (1 band)
  M = Medium (2 bands: Low Band + High Band)
  L = Large  (3 bands: Low Band + High Band + MAA/n78)

Examples:
  NM_    = Nokia, 1 sector Medium
  NMM_   = Nokia, 2 sectors Medium      (Bergsøyvegen)
  NLLL_  = Nokia, 3 sectors Large       (Hareid)
  NMMM_  = Nokia, 3 sectors Medium
  NSSS_  = Nokia, 3 sectors Small
  NSS_   = Nokia, 2 sectors Small
  NS_    = Nokia, 1 sector Small
  ULLL_  = Other vendor, 3 sectors Large
  UL_    = Other vendor, 1 sector Large
  UM_    = Other vendor, 1 sector Medium
  US_    = Other vendor, 1 sector Small
```

### Parsing Rules

```python
def parse_config(config_string: str) -> dict:
    """
    Parse config string into structured data.
    
    NMM_ → {vendor: "Nokia", sectors: 2, sector_configs: ["M", "M"], has_large: False}
    NLLL_ → {vendor: "Nokia", sectors: 3, sector_configs: ["L", "L", "L"], has_large: True}
    """
    clean = config_string.rstrip("_")
    vendor_prefix = clean[0]  # N or U
    sector_letters = clean[1:]  # MM, LLL, SSS, etc.
    
    vendor = "Nokia" if vendor_prefix == "N" else "Other"
    sectors = len(sector_letters)
    sector_configs = list(sector_letters)
    has_large = "L" in sector_configs
    has_medium = "M" in sector_configs
    
    # Derived counts
    rrh_per_sector = {
        "S": 1,  # 1 band → 1 RRH
        "M": 2,  # 2 bands → 2 RRH (LB + HB)
        "L": 3,  # 3 bands → 3 RRH (LB + HB + MAA)
    }
    total_rrh = sum(rrh_per_sector[s] for s in sector_configs)
    
    return {
        "vendor": vendor,
        "sectors": sectors,
        "sector_configs": sector_configs,
        "has_large": has_large,
        "has_medium": has_medium,
        "total_rrh": total_rrh,
    }
```

**IMPORTANT:** The config string is entered directly by the engineer. It is NOT auto-calculated from sector count. The frontend currently auto-calculates it — this must be changed. The engineer knows the config from the RNP (Radio Network Plan) document.

---

## Site Categories

| Category | Cabinet Default | Earthing | Mount Type | Notes |
|----------|----------------|----------|------------|-------|
| Rooftop | Indoor | TN-400V | Gravitation/Tripod | Most common. Ballast blocks for gravitation. |
| Barn | Outdoor | IT-230V or TN-400V | Wall mount + pipe | Private building. Cable route often external. |
| Tower | Outdoor | TT-230V | Clamp on steel | Height work. Climbing equipment required. |
| Indoor | Indoor | TN-400V | Rack mount | Equipment room exists. DAS possible. |
| Greenfield | Outdoor | TT-230V | New foundation | New site from scratch. Crane likely needed. |

---

## Dependency Rules

These rules map TSSR inputs to BOQ line item quantities. Product codes reference the Naun master BOQ Excel (782-row catalog).

### Rule Categories

Rules are evaluated in order. Later rules can depend on values set by earlier rules.

### 1. Sector-Driven Rules

These scale linearly with sector count.

| BOQ Item | Product Code | Rule | Formula |
|----------|-------------|------|---------|
| RRH (LB) | AHEGB (or variant) | 1 per sector | `sectors` |
| RRH (HB) | (HB variant code) | 1 per sector | `sectors` |
| RRH (MAA/n78) | AQQY (or variant) | 1 per Large sector | `count(L in sector_configs)` |
| Antenna | (antenna code) | 1 per sector | `sectors` |
| ATOA box | (ATOA code) | 1 per sector | `sectors` |
| Antenna jumpers | (jumper code) | 8 per sector (4T4R × 2 ports) | `sectors × 8` |
| Fiber trunk connectors | (connector code) | 1 per sector | `sectors` |
| Fiber patch cables | (patch code) | 4 per sector | `sectors × 4` |
| RRH mounting bracket | (bracket code) | 1 per sector | `sectors` |
| Antenna clamp set | (clamp code) | 1 per sector | `sectors` |
| RRH rail | (rail code) | 1 per sector | `sectors` |
| Walk tests | ice_PM_004 | 3 per sector | `sectors × 3` |
| RRH installation | ice_RM_003 | per sector × RRH/sector | `total_rrh` |
| RRH rail install | ice_RM_004 | 1 per sector | `sectors` |
| ATOA install | ice_RM_014 | 1 per sector | `sectors` |
| Antenna install | (service code) | 1 per sector | `sectors` |

### 2. Config Size Rules

Triggered by whether config contains Large (L) sectors.

| Condition | BOQ Items Added | Quantity |
|-----------|----------------|----------|
| Any L sector | GPS antenna kit | 1 |
| Any L sector | GPS cable | 1 |
| Any L sector | GPS LNA | 1 |
| Any L sector | GPS bracket | 1 |
| Any L sector | AQQY MAA RRH | `count(L sectors)` |
| Any L sector | SFP28 modules | `count(L sectors)` |
| Large config | AMIA subrack .205 | 1 |
| Large config | ASIB common .102 | 1 |
| Large config | ABIO capacity .102 | 2 |
| Medium config | ABIO capacity .102 | 1 |
| Small config | (minimal system modules) | varies |

### 3. Cabinet & Power Rules

Driven by `cabinet_type` (Indoor/Outdoor) and `site_category`.

| Condition | Product | Code | Qty |
|-----------|---------|------|-----|
| Indoor cabinet | ACDB TN-400V-1B (with/without DCDU) | (code) | 1 |
| Indoor cabinet | Rectifier CTE31242 Indoor (3×3p) | (code) | 1 |
| Indoor cabinet | Earthing 400V TN | (code) | 1 |
| Indoor cabinet | Battery 12V (2 strings × 8) | (code) | 16 |
| Outdoor cabinet | ACDB IT-230V or TT-230V | (code) | 1 |
| Outdoor cabinet | Rectifier CTE31239 Outdoor (2×3p) | (code) | 1 |
| Outdoor cabinet | Earthing 230V IT/TT | (code) | 1 |
| Outdoor cabinet | EDP/OVP outdoor | (code) | 1 |
| Outdoor cabinet | DCDU outdoor | (code) | 1 |
| Any | Smart meter | (code) | 1 |
| Any | Alarm cable 10m | EAC code | 1 |

### 4. Cable Length Rules

Driven by `cable_route_lengths[]` (per sector) and `cable_ladder_length`.

```python
total_cable_route = sum(cable_route_lengths)  # Sum of all sector routes in meters

# Material quantities
fiber_sm_12core = total_cable_route           # Single-mode fiber matches total route
dc_cable_6mm2 = total_cable_route + 32        # DC cable = route + ~32m base (cabinet-internal + airscale)
ground_cable_16mm2 = 45                       # Standard 45m (adjustable per site)
cable_ladder_300mm = cable_ladder_length       # From TSSR input directly

# Service quantities (must match material)
fiber_install_service = fiber_sm_12core       # Meters must match material
dc_install_service = dc_cable_6mm2            # Meters must match material
```

### 5. Site Category Rules

| Condition | BOQ Items | Notes |
|-----------|-----------|-------|
| Rooftop + Gravitation | Ballast blocks 50kg | 4 per mount point (`sectors × 4`) |
| Rooftop + Gravitation | Gravitation mount base | 1 per sector |
| Rooftop | Cable ladder | Per `cable_ladder_length` |
| Rooftop | Roof waterproofing kit | 1 per site |
| Barn | Wall mount bracket | 1 per sector |
| Barn | External cable protection | Per cable route |
| Tower | Climbing harness check | 1 per site |
| Tower | Tower clamp mount | 1 per sector |
| Any + crane_needed | Crane service | 1 |
| Any + crane_needed | Crane mobilization | 1 |

### 6. Fixed Per-Site Rules

These are constant regardless of config (but can be manually overridden).

| Item | Default Qty | Unit |
|------|-------------|------|
| Site commissioning | 1 | site |
| Telecom technician hours | 12 | hours |
| Ground cable 16mm² | 45 | m |
| Alarm cable 10m | 1 | pcs |
| Site documentation | 1 | site |
| Fire sealing | per cable penetrations | pcs |

### 7. Conditional Rules

| Condition | Item | Qty |
|-----------|------|-----|
| `painting_required` | Painting service | `sectors` items |
| `crane_needed` | Crane service | 1 |
| `site_category == "Tower"` | Height work safety | 1 |
| Manual override exists | Keep override, ignore recalculated value | — |

---

## Validation Rules

These run after BOQ generation and flag errors, warnings, or confirmations.

### Cross-Field Validations

```
V001 — Config string vs sector count
  Check: number of sector letters in config == sector count
  Error: "Config '{config}' implies {n} sectors but {actual} defined"

V002 — RRH count vs sectors
  Check: RRH quantity == sectors (for each RRH type)
  Error: "RRH count ({qty}) doesn't match sector count ({sectors})"

V003 — GPS kit for Large config
  Check: if has_large then GPS items qty > 0
  Error: "GPS kit required when config includes Large (L) sectors"

V004 — ACDB matches earthing
  Check: TN ACDB ↔ TN earthing, IT ACDB ↔ IT earthing
  Error: "ACDB type ({acdb}) doesn't match earthing system ({earthing})"

V005 — Jumper count vs antenna ports
  Check: jumpers == sectors × 8 (for 4T4R dual-port antennas)
  Warning: "Jumper count ({qty}) doesn't match expected {sectors × 8}"

V006 — Cabinet type vs site category
  Check: Indoor category → Indoor cabinet, Outdoor site → Outdoor cabinet
  Warning: "Outdoor cabinet unusual for indoor site category"

V007 — Battery config standard
  Check: battery quantity is multiple of 8 (standard string)
  Warning: "Non-standard battery count ({qty}), expected multiple of 8"
```

### Material-Service Consistency

```
V010 — Fiber material vs install service
  Check: fiber_material_meters == fiber_install_meters
  Warning: "Fiber material ({mat}m) ≠ install service ({svc}m)"

V011 — DC cable material vs install service  
  Check: dc_material_meters == dc_install_meters
  Warning: "DC cable material ({mat}m) ≠ install service ({svc}m)"

V012 — Antenna material count vs install count
  Check: antenna_qty == antenna_install_qty
  Error: "Antenna material ({mat}) ≠ install service ({svc})"

V013 — RRH material count vs install count
  Check: rrh_material_qty == rrh_install_qty
  Error: "RRH material ({mat}) ≠ install service ({svc})"
```

### Reasonableness Checks

```
V015 — Walk test count
  Check: walk_tests between sectors×2 and sectors×3
  Warning: "Walk test count ({qty}) outside typical range for {sectors} sectors"

V016 — Cable route sanity
  Check: each sector cable_route between 5m and 200m
  Warning: "Sector {id} cable route ({len}m) outside typical range"

V017 — Technician hours
  Check: tech_hours between 8 and 24
  Warning: "Technician hours ({hrs}) outside typical range"

V018 — Total BOQ items sanity
  Check: active items between 30 and 80 for a standard site
  Warning: "Active BOQ items ({count}) outside typical range"
```

---

## Cascading Update Behavior

When a TSSR field changes, the dependency engine must:

1. Recalculate all affected BOQ items
2. Skip items with `is_manual_override = true` (preserve engineer's intent)
3. Diff new quantities against old quantities
4. Return the diff with old/new values and which rule caused the change
5. Run validation rules against the new state
6. Frontend animates changed items (yellow pulse, "← was X" annotation)

### Example Cascade: sectors 2 → 3

```
Input change: sectors = 3, config = "NLLL_"

Recalculated:
  RRH (LB): 2 → 3          (rule: 1 per sector)
  RRH (HB): 2 → 3          (rule: 1 per sector)
  RRH (MAA): 0 → 3         (rule: L sectors only, NEW items)
  GPS kit: 0 → 1           (rule: Large config, NEW items)
  Antennas: 2 → 3          (rule: 1 per sector)
  Jumpers: 16 → 24         (rule: 8 per sector)
  ABIO cards: 1 → 2        (rule: 2 for Large)
  SFP28 modules: 0 → 3     (rule: 1 per L sector, NEW)
  Fiber trunk: unchanged    (depends on cable route, not sectors)
  DC cable: recalculated    (depends on total_rrh × route)
  Walk tests: 6 → 9        (rule: 3 per sector)
  RRH install: 4 → 9       (rule: total_rrh)
  ATOA: 2 → 3              (rule: 1 per sector)
  ... ~25 more items change

Diff response: 30+ changed items, 7 new items, 0 removed
```

---

## BOQ Excel Structure (Naun / Kjerag Template)

The master BOQ is a fixed-row Excel workbook with this structure:

```
Sheet: "BoQ" (main)
  Rows 1-9: Header metadata (site ID, name, config, SPL, pricing summary)
  Row 10+: Catalog items (782 rows total)

Columns:
  A: Site ID (auto-filled)
  B: Product code ← KEY IDENTIFIER
  C: Description
  D: Quantity ← ENGINEER FILLS THIS (yellow cells)
  E: Comments ← ENGINEER FILLS THIS (yellow cells)
  F: ACT_Qty (actuals, filled post-build)
  G: ACT_Comment
  H: Ordering hints (pre-filled guidance)
  I: Product category
  J: Product subcategory  
  K: Source of ordering
  L: Vendor
  M: Contractor name
  N-S: Pricing columns
  T: Type of work
  U: Act-Est delta

Other sheets:
  "D365" — Auto-populated ordering template from BoQ quantities
  "BoM Griptel" — Steel/mounting hardware sub-catalog
  "BoM Solar" — Electrical supplies sub-catalog
  "Version" — Change log
  "info" — Detailed change history
  "Aux" — Reference data (pricing, service items, contractors)
```

### Important: Fixed Row Template

The BOQ is NOT generated row by row. It is a **fixed 782-row catalog** where every possible item is pre-listed. The engineer's job is to fill in Quantity (column D) for applicable items. Rows stay in place — the tool just populates quantities.

This means:
- Import parses all 782 rows, maps each to a catalog item with its row_index
- Dependency engine sets quantities on matched rows
- Export writes quantities back to the exact same row positions
- Unmatched/unused rows stay at quantity 0

---

## Cross-Document Relationships (TSSR ↔ BOQ)

The same information appears in both documents. When BOQ changes, TSSR sections must reflect it.

| BOQ Change | TSSR Section Affected |
|------------|----------------------|
| Sector count | §1 Description, §3.6 Mounts, §3.8 System Modules, §5 Drawings |
| RRH model/count | §4.1 RFM/RRH Information |
| Cabinet type | §3.2 Shelter, §3.5 Power (CW Installation) |
| ACDB/Rectifier | §3.5 Power (CW Installation) |
| Cable lengths | §3.7 AC/DC/GND Cabling table |
| Fiber details | §3.9 Fiber/RET table |
| Mount type | §3.6 Antenna and Cabinet Mounts |
| Crane needed | §1.1 Delivery section |
| HSE hazards | §2 SHA/HSE section |

---

## Known Gaps (Need More Data)

Rules extracted from 2 site pairs (Bergsøyvegen BARN 2-sector, Hareid Rooftop 3-sector). Missing coverage for:

- Tower site mounting and cable rules
- Indoor/DAS deployment patterns
- Colocation (shared site) specific rules
- Trunk fiber length calculation (appears route-specific, not formulaic)
- Additional services pricing heuristics
- SFP allocation when mixing M and L sectors on same site
- Regional travel pricing differentiation
- Telenor-specific and Telia-specific template differences
