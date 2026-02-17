# SKILLS.md — Telecom Reference & Terminology

Reference material for working with Norwegian telecom base station documentation. Consult when encountering specific product codes, TSSR sections, or telecom terminology.

---

## TSSR Document Structure

Full section hierarchy of a Technical Site Survey Report. Every TSSR follows this structure regardless of site type.

```
COVER PAGE
├── Site Name, Site ID, Site Model, Site Type
├── Customer (operator: Telenor / Telia / ICE)
├── Site Owner (landlord)
├── Supporting docs: SART version, RFSR/RNP version, Guideline version
├── Veiviser / iLOQ (site access credentials)
└── TSSR Alignment confirmations

REVISION HISTORY TABLE
├── Rev, Nr, Name, Company, Type (Visit/TSSR Produced), Date

§1. DESCRIPTION OF PLANNED WORKS
├── Safety narrative (SJA boilerplate — varies by site category)
├── Site room / cabinet description
├── AC Distribution
├── Transmission
├── Cables and cable route description
├── Antenna mounts (per sector)
├── Other tasks
│
├── §1.1 DELIVERY
│   ├── Time of year: Summer ☐ / Winter ☐
│   ├── Personnel access: Car ☐ / Foot ☐ / ATV ☐ / Snowmobile ☐
│   ├── Equipment delivery: Car ☐ / ATV ☐ / Snowmobile ☐ / Helicopter ☐
│   ├── Comments (landlord contact, GPS coordinates, access instructions)
│   ├── Crane: Yes ☐ / No ☐ (+ type, reach, position if yes)
│   └── Helicopter: Yes ☐ / No ☐ (+ landing coordinates if yes)

§2. SHA/HSE — Health & Safety
├── Site category checkboxes: Rooftop ☐ / Greenfield ☐ / SITEShare ☐ / BARN ☐ / INDOOR ☐ / TUNNEL ☐
├── Method description for work at height
├── Site specific hazards (free text)
├── Site specific risk mitigating measures (free text)
├── HSE procedures checklist
└── Special safety requirements from landlord

§3. SITE INFORMATION — Existing Situation
├── §3.1 Building & Roof(top)
│   ├── Building type, facade, height
│   ├── Roof type (flat/pitched), material, load capacity
│
├── §3.2 Shelter / Equipment Room
│   ├── Dimensions, materials, existing equipment
│
├── §3.3 REQUIRED SITE INFORMATION (TOWER)
│   ├── Tower type, height, diameter
│   ├── Cable routes, available space
│
├── §3.4 Main AC / Power Meter and GND
│   ├── Main breaker location and distance
│   ├── Breaker capacity (amps)
│   ├── Earthing system: 230 IT ☐ / 400 TN ☐
│   └── Main ground bar location and remarks
│
├── §3.5 POWER (CW Installation)
│   ├── Power Meter / Smart Meter
│   ├── ACDB — type (Indoor/Outdoor, with/without DCDU)
│   ├── Rectifier — cabinet type, SPD type, Flatpack type
│   ├── Battery — backup hours, strings, capacity
│   ├── Ventilation/Cooling
│   └── Cable Inlet
│
├── §3.6 Antenna and Cabinet Mounts
│   ├── Per-sector: mount type, products, dimensions
│   └── OD Cabinet mount type
│
├── §3.7 AC, Main DC and GND Cabling
│   └── Table: Source → Type, Size (mm²), Length (m), Core drilling, Fire sealing, New inlets, Termination
│
├── §3.8 System and RF Modules
│   └── Table: Module type, Sector ID, Cabinet/PDU, Breaker Nr, Breaker Size, Length, Size, OVP
│
├── §3.9 Fiber/RET
│   └── Table: Cable type, Sector ID, From (cabinet/RRH/RET), Amount
│
└── §3.10 CW and Power Summary

§4. TI INSTALLATION
├── §4.1 RFM/RRH and SM Information
│   ├── Cabinet Type, System Module Type/Location
│   ├── Number of BB Cards (ABIO/ASIB count)
│   └── New RF/RRH locations (per sector)
│
├── §4.2 TRM Information
│   └── Table: Equipment, Location, Port, Connector type, Distance, SFP
│
└── §4.3 TI Installation Summary (embedded from RNP)

§5. DRAWINGS
├── §5.1 Antenna Directions (azimuth reference photos per sector)
├── §5.2 Equipment Room/Shelter Overview
└── §5.3 Site Plan (bird-eye view)

§6. APPENDIX
├── RRH-Antenna connection diagrams
├── Cabinet installation instructions
└── Site photos (overview, access, details)
```

---

## TSSR Photo Requirements

Each TSSR requires specific photos organized by section:

| Section | Photos Required | Notes |
|---------|----------------|-------|
| Site Overview & Access | 2-5 | Building exterior, access road, entrance |
| Antenna Directions | 1 per sector | Looking FROM antenna position in azimuth direction |
| Equipment Room | 2-4 | Existing equipment, available space, cable entry |
| Cable Route | 2-4 | Full path from equipment room to antenna positions |
| Roof / Mounting Area | 2-4 | Mounting surface, existing infrastructure |
| Power Meter / Main Breaker | 1-2 | Breaker panel, capacity label |
| Grounding | 1-2 | Ground bar, earth rod location |
| Crane Area | 1-2 (if crane needed) | Crane setup position, reach area |

Photos should include EXIF compass data when possible — helps verify antenna azimuth alignment.

---

## BOQ Product Code Patterns

Product codes in the Naun/Kjerag BOQ follow conventions:

### Hardware Product Codes
```
AHEGB           — Airscale RRH (specific model: DUAL RRH 4T4R B13 320W)
AQQY            — MAA (Massive Antenna Array) RRH for n78 band
AMIA.205        — AMIA Subrack (system module, Large config)
ASIB.102        — ASIB Common module
ABIO.102        — ABIO Capacity module (baseband card)
CTE31242        — Rectifier cabinet Indoor (3 × 3-phase)
CTE31239        — Rectifier cabinet Outdoor (2 × 3-phase)
EAC             — Alarm cable
RRZZ-65A        — Antenna model (1499mm, Medium config)
RRZZ-65B        — Antenna model (2100mm, Large config)
SFP28           — Optical transceiver (for MAA connections)
```

### Cable Product Codes
```
SL2C6MM2FRNC-S-BK-N    — DC cable 2×6mm² FRNC (black)
SL2C35MM2FRNC-S-BK-N   — DC cable 2×35mm² FRNC (black)
FIB-SM-12               — Single-mode fiber 12-core
```

### Service Item Codes (ICE/Kjerag specific)
```
ice_PM_004      — Walk test (per test)
ice_RM_003      — RRH installation
ice_RM_004      — RRH rail installation
ice_RM_014      — FTTA/ATOA box installation
ice_cable_006   — DC cable 6mm² installation (per meter)
ice_cable_XXX   — Other cable installation services
ice_CW_XXX      — Civil works services
```

### BOQ Categories (as they appear in the Excel)

The 782-row catalog is organized into these categories:

```
1. System Modules       — AMIA, ASIB, ABIO, EAC, GPS
2. Radios & RRH         — AHEGB, AQQY, SFP28
3. Antennas             — RRZZ models, brackets, clamps
4. Fiber & Optics       — Fiber cable, trunks, patch cables, connectors
5. Power Equipment      — ACDB, rectifier, battery, DCDU, EDP/OVP
6. Cables               — DC cable, ground cable, alarm cable
7. Cable Management     — Cable ladder, tray, clamps, fire sealing
8. Mounting Hardware    — Gravitation mounts, wall mounts, ballast, brackets
9. Grounding            — Ground bar (JR115), earth rod, ground cable
10. Services            — Installation labor per item type
11. Additional Services — Crane, painting, helicopter, special transport
12. Travel & Transport  — Mobilization, regional travel rates
```

---

## Electrical Reference

### Earthing Systems (Norwegian Standard)

| System | Voltage | Typical Use | ACDB Type |
|--------|---------|-------------|-----------|
| TN | 400V 3-phase | Indoor sites, rooftop | TN-400V-1B |
| IT | 230V 1-phase | Barns, rural outdoor | IT-230V (with IMO) |
| TT | 230V 1-phase | Towers, greenfield | TT-230V-1B |

### Power Equipment Selection

```
Indoor site:
  ACDB: TN-400V-1B (with or without integrated DCDU)
  Rectifier: CTE31242 (indoor cabinet, 3 × Flatpack 3-phase)
  Battery: 2 strings × 8 batteries = 16 × 12V 100Ah (4hr backup)
  SPD: Integrated in ACDB
  
Outdoor site:
  ACDB: IT-230V or TT-230V (depends on earthing)
  Rectifier: CTE31239 (outdoor cabinet, 2 × Flatpack 3-phase)  
  DCDU: Separate unit (not integrated in outdoor ACDB)
  EDP/OVP: External DC protection
  Battery: Same spec, housed in outdoor cabinet
```

### DC Cable Sizing

```
2×6mm²    — Standard for RRH power feed (up to ~100m runs)
2×35mm²   — Rectifier to DCDU connection (short runs, ~5-10m)
2×16mm²   — Ground cable standard
```

---

## Antenna & RF Reference

### Antenna Models

| Model | Height | Config | Ports | Use |
|-------|--------|--------|-------|-----|
| RRZZ-65A | 1499mm | Medium (M) | 8 (4×4 MIMO) | LB+HB dual-band |
| RRZZ-65B | 2100mm | Large (L) | 8+4 | LB+HB+MAA triple-band |

### RRH Types

| Type | Band | Config Required | Per Sector |
|------|------|-----------------|------------|
| AHEGB (LB) | Low Band (700-900 MHz) | All (S, M, L) | 1 |
| AHEGB (HB) | High Band (1800-2600 MHz) | M, L | 1 |
| AQQY (MAA) | n78 (3.5 GHz) | L only | 1 |

### Jumper Allocation

```
Standard 4T4R antenna (8 ports):
  4 × TX/RX jumpers to RRH
  4 × diversity/MIMO jumpers to RRH
  = 8 jumpers per sector

Jumper length selection:
  Cable route < 3m  → 3m jumpers (coiled)
  Cable route 3-6m  → 6m jumpers
  Cable route > 6m  → custom or 10m
```

---

## Workflow Terminology

| Term | Meaning |
|------|---------|
| TSSR | Technical Site Survey Report — the narrative document describing the site and planned work |
| BOQ | Bill of Quantities — the Excel spreadsheet listing all materials and services with quantities |
| SART | Site Acquisition Report — pre-TSSR document with landlord/access info |
| RNP | Radio Network Plan — the radio engineer's plan specifying config, frequencies, azimuths |
| RFSR | RF Site Review — radio frequency analysis of the site |
| SPL | Site Project Lead — operator-side project manager who approves submissions |
| SJA | Sikker Jobb Analyse — Safe Job Analysis (Norwegian HSE requirement) |
| CW | Civil Works — non-radio physical infrastructure (power, mounting, cables) |
| TI | Telecom Installation — radio-specific work (RRH, antennas, fiber) |
| OD | Outdoor — refers to outdoor cabinet/equipment |
| MAA | Massive Antenna Array — 5G NR n78 band antenna unit |
| ATOA | Antenna Top of Amplifier — signal amplifier box mounted near antenna |
| RET | Remote Electrical Tilt — motorized antenna downtilt system |
| FTTA | Fiber To The Antenna — fiber connection from cabinet to antenna position |
| IMO | Insulation Monitoring — required for IT earthing systems |
| EDP | External DC Protection — surge protection for outdoor DC |
| OVP | Over Voltage Protection |
| DCDU | DC Distribution Unit — distributes DC power from rectifier to equipment |
| Flatpack | Rectifier module unit (fits in rectifier cabinet) |
| iLOQ | Digital lock system for site access |
| Veiviser | Norwegian for "wayfinder" — site access instructions |
| Naun | The operator project name (internal codename for ICE/Lyse Tele network buildout) |
| Kjerag | The contractor project name for the same buildout |

---

## Norwegian Operator Differences

| | ICE (Lyse Tele) | Telenor | Telia |
|--|-----------------|---------|-------|
| BOQ Template | Naun/Kjerag 782-row | Different template | Different template |
| Config format | NMMM_, NLLL_ etc. | Similar but may vary | Similar but may vary |
| TSSR template | Kjerag-specific | Telenor standard | Telia standard |
| Approval flow | SPL reviews | Regional approval | Telia approval |
| Service codes | ice_PM_xxx, ice_RM_xxx | TNO_xxx | TEL_xxx |
| Pricing | Per-item from Naun catalog | Framework agreement | Framework agreement |

**Note:** Current implementation targets ICE/Kjerag only. Multi-operator support is Phase 4.

---

## File Format Reference

### BOQ Export (.xlsx)

The exported BOQ must exactly match the Naun template structure:
- Same row positions (782 rows)
- Quantities in column D
- Comments in column E
- Site metadata in rows 1-9
- Yellow cell formatting on editable cells
- Formulas in pricing columns preserved (not overwritten)

### TSSR Export (.docx)

The exported TSSR follows the operator's Word template:
- Specific heading styles and numbering
- Tables with exact column structure (especially §3.7, §3.8, §3.9)
- Checkbox formatting for yes/no fields
- Embedded photos with captions
- Site plan drawing as image
- Revision history table
- Cover page with operator logo

---

## Common Rejection Reasons

From field experience, these are frequent reasons TSSRs get sent back:

1. **Config/quantity mismatch** — BOQ quantities don't match stated config
2. **Missing photos** — Antenna direction photos missing for one or more sectors
3. **Cable length inconsistency** — Material meters don't match installation service meters
4. **Wrong ACDB for earthing** — TN ACDB specified but site has IT earthing
5. **Missing GPS for Large** — Large config but no GPS items in BOQ
6. **Incomplete HSE section** — Missing site-specific hazards or mitigations
7. **Wrong antenna model** — Medium antenna specified but Large config items in BOQ
8. **Missing crane justification** — Crane in BOQ but no crane details in §1.1 Delivery
9. **Battery config non-standard** — Non-standard battery count without justification
10. **Incomplete revision history** — No visit date or TSSR production date recorded
