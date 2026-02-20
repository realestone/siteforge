Here’s an adjusted SKILLS.md for SiteForge, reflecting your actual TSSR and BOQ files, Norwegian telecom terminology, and practical workflow nuances. This version clarifies section structure, product codes, photo requirements, and common rejection reasons, making it a true reference for engineers and reviewers.

***

# SKILLS.md — Telecom Reference & Terminology (SiteForge, 2026)

Reference material for Norwegian telecom base station documentation. Use this as a quick lookup for TSSR sections, BOQ product codes, and domain-specific terminology.

***

## TSSR Document Structure

Every TSSR follows this hierarchy, regardless of site type:

    COVER PAGE
    ├── Site Name, Site ID (AREA prefix), Site Model, Site Type
    ├── Customer (operator: Telenor / Telia / ICE)
    ├── Site Owner (landlord)
    ├── Supporting docs: SART, RFSR/RNP, Guideline version
    ├── Veiviser / iLOQ (site access credentials)
    └── TSSR Alignment confirmations

    REVISION HISTORY TABLE
    ├── Rev, Nr, Name, Company, Type (Visit/TSSR Produced), Date

    §1. DESCRIPTION OF PLANNED WORKS
    ├── Safety narrative (SJA, PPE, crane/lift, risk assessment)
    ├── Site room / cabinet description (frame, ground rail, cabinet, rectifier, batteries, ACDB, DCDU, Airscale, iLOQ)
    ├── AC Distribution (power supply, circuit, surge protection, cables, junction box)
    ├── Transmission (operator solution, OTC, 2G reference)
    ├── Cables and cable route (ladder, DC cables, fiber, jumpers, RET, grounding)
    ├── Antenna mounts (per sector: mount, antenna, RRH, rails, jumpers, GPS, fiber coil)
    ├── Other tasks (cleanup, ASBUILT, walk test, group chart, photos, EMF sticker, rectifier alarm test)
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
    ├── §3.1 Building & Roof(top): type, facade, height, roof type/material
    ├── §3.2 Shelter / Equipment Room: dimensions, materials, equipment
    ├── §3.3 Tower: type, height, diameter, cable routes
    ├── §3.4 Main AC / Power Meter and GND: breaker location, capacity, earthing system, ground bar
    ├── §3.5 POWER (CW Installation): meter, ACDB, rectifier, battery, ventilation, cable inlet
    ├── §3.6 Antenna and Cabinet Mounts: per-sector mounts, OD cabinet mount
    ├── §3.7 AC, Main DC and GND Cabling: source, type, size, length, drilling, sealing, inlets, termination
    ├── §3.8 System and RF Modules: module type, sector ID, cabinet/PDU, breaker, size, OVP
    ├── §3.9 Fiber/RET: cable type, sector ID, from, amount
    └── §3.10 CW and Power Summary

    §4. TI INSTALLATION
    ├── §4.1 RFM/RRH and SM Information: cabinet, module, BB cards, RF/RRH locations
    ├── §4.2 TRM Information: equipment, location, port, connector, distance, SFP
    └── §4.3 TI Installation Summary

    §5. DRAWINGS
    ├── Antenna Directions (azimuth photos per sector)
    ├── Equipment Room/Shelter Overview
    └── Site Plan (bird-eye view)

    §6. APPENDIX
    ├── RRH-Antenna connection diagrams
    ├── Cabinet installation instructions
    └── Site photos (overview, access, details)

***

## TSSR Photo Requirements

| Section                | Photos Required | Notes                                    |
| ---------------------- | --------------- | ---------------------------------------- |
| Site Overview & Access | 2–5             | Building exterior, access road, entrance |
| Antenna Directions     | 1 per sector    | Azimuth reference from antenna position  |
| Equipment Room         | 2–4             | Existing equipment, space, cable entry   |
| Cable Route            | 2–4             | Path from cabinet to antenna positions   |
| Roof / Mounting Area   | 2–4             | Surface, infrastructure, mount points    |
| Power Meter / Breaker  | 1–2             | Panel, capacity label                    |
| Grounding              | 1–2             | Ground bar, earth rod                    |
| Crane Area             | 1–2 (if needed) | Setup position, reach area               |

Photos should include EXIF compass data for antenna alignment.

***

## BOQ Product Code Patterns

### Hardware Product Codes

*   **AHEGB** — Airscale RRH (DUAL RRH 4T4R B13 320W)
*   **AQQY** — MAA RRH for n78 band
*   **AMIA.205** — AMIA Subrack (Large config)
*   **ASIB.102** — ASIB Common module
*   **ABIO.102** — ABIO Capacity module (baseband card)
*   **CTE31242** — Rectifier cabinet Indoor (3 × 3-phase)
*   **CTE31239** — Rectifier cabinet Outdoor (2 × 3-phase)
*   **EAC** — Alarm cable
*   **RRZZ-65A/B** — Antenna models (Medium/Large config)
*   **SFP28** — Optical transceiver (MAA connections)

### Cable Product Codes

*   **SL2C6MM2FRNC-S-BK-N** — DC cable 2×6mm² FRNC (black)
*   **SL2C35MM2FRNC-S-BK-N** — DC cable 2×35mm² FRNC (black)
*   **FIB-SM-12** — Single-mode fiber 12-core

### Service Item Codes (ICE/Kjerag)

*   **ice\_PM\_004** — Walk test
*   **ice\_RM\_003** — RRH installation
*   **ice\_RM\_004** — RRH rail installation
*   **ice\_RM\_014** — FTTA/ATOA box installation
*   **ice\_cable\_006** — DC cable 6mm² installation (per meter)
*   **ice\_CW\_XXX** — Civil works services

### BOQ Categories (Naun/Kjerag Excel)

1.  System Modules
2.  Radios & RRH
3.  Antennas
4.  Fiber & Optics
5.  Power Equipment
6.  Cables
7.  Cable Management
8.  Mounting Hardware
9.  Grounding
10. Services
11. Additional Services
12. Travel & Transport

***

## Electrical Reference

| System | Voltage | Typical Use       | ACDB Type  |
| ------ | ------- | ----------------- | ---------- |
| TN     | 400V    | Indoor/rooftop    | TN-400V-1B |
| IT     | 230V    | Barns/outdoor     | IT-230V    |
| TT     | 230V    | Towers/greenfield | TT-230V-1B |

*   **Indoor:** ACDB TN-400V-1B, CTE31242, 16 × 12V batteries, integrated SPD
*   **Outdoor:** ACDB IT/TT-230V, CTE31239, DCDU, EDP/OVP, same battery spec

***

## Antenna & RF Reference

| Model    | Height | Config | Ports | Use                   |
| -------- | ------ | ------ | ----- | --------------------- |
| RRZZ-65A | 1499mm | Medium | 8     | LB+HB dual-band       |
| RRZZ-65B | 2100mm | Large  | 8+4   | LB+HB+MAA triple-band |

| RRH Type   | Band      | Config  | Per Sector |
| ---------- | --------- | ------- | ---------- |
| AHEGB (LB) | 700–900   | S, M, L | 1          |
| AHEGB (HB) | 1800–2600 | M, L    | 1          |
| AQQY (MAA) | n78       | L only  | 1          |

*   **Jumpers:** 8 per sector (4T4R dual-port antennas)
*   **Jumper length:** Based on cable route (3m, 6m, 10m, custom)

***

## Workflow Terminology

| Term     | Meaning                        |
| -------- | ------------------------------ |
| TSSR     | Technical Site Survey Report   |
| BOQ      | Bill of Quantities             |
| SART     | Site Acquisition Report        |
| RNP      | Radio Network Plan             |
| RFSR     | RF Site Review                 |
| SPL      | Site Project Lead              |
| SJA      | Sikker Jobb Analyse            |
| CW       | Civil Works                    |
| TI       | Telecom Installation           |
| OD       | Outdoor cabinet/equipment      |
| MAA      | Massive Antenna Array          |
| ATOA     | Antenna Top of Amplifier       |
| RET      | Remote Electrical Tilt         |
| FTTA     | Fiber To The Antenna           |
| IMO      | Insulation Monitoring          |
| EDP      | External DC Protection         |
| OVP      | Over Voltage Protection        |
| DCDU     | DC Distribution Unit           |
| Flatpack | Rectifier module               |
| iLOQ     | Digital lock system            |
| Veiviser | Site access instructions       |
| Naun     | ICE/Lyse Tele project codename |
| Kjerag   | Contractor project codename    |

***

## Norwegian Operator Differences

| Operator | BOQ Template | Config Format  | TSSR Template | Approval Flow | Service Codes | Pricing   |
| -------- | ------------ | -------------- | ------------- | ------------- | ------------- | --------- |
| ICE      | Naun/Kjerag  | NMMM\_, NLLL\_ | Kjerag        | SPL reviews   | ice\_PM\_xxx  | Per-item  |
| Telenor  | TNO          | Similar        | Telenor       | Regional      | TNO\_xxx      | Framework |
| Telia    | TEL          | Similar        | Telia         | Telia         | TEL\_xxx      | Framework |

***

## File Format Reference

*   **BOQ Export (.xlsx):** Matches Naun template, 782 rows, quantities in column D, comments in E, metadata in rows 1–9, yellow cells editable, formulas preserved.
*   **TSSR Export (.docx):** Matches operator Word template, correct headings, tables, checkboxes, embedded photos, site plan, revision history, cover page.

***

## Common Rejection Reasons

1.  Config/quantity mismatch
2.  Missing photos (antenna directions, site access)
3.  Cable length inconsistency (material vs install service)
4.  Wrong ACDB for earthing system
5.  Missing GPS for Large config
6.  Incomplete HSE section
7.  Wrong antenna model for config
8.  Missing crane justification
9.  Non-standard battery config
10. Incomplete revision history

***

**Use this file as a quick reference for terminology, section structure, product codes, and workflow best practices.**








































































TermMeaningTSSRTechnical Site Survey ReportBOQBill of QuantitiesSARTSite Acquisition ReportRNPRadio Network PlanRFSRRF Site ReviewSPLSite Project LeadSJASikker Jobb AnalyseCWCivil WorksTITelecom InstallationODOutdoor cabinet/equipmentMAAMassive Antenna ArrayATOAAntenna Top of AmplifierRETRemote Electrical TiltFTTAFiber To The AntennaIMOInsulation MonitoringEDPExternal DC ProtectionOVPOver Voltage ProtectionDCDUDC Distribution UnitFlatpackRectifier moduleiLOQDigital lock systemVeiviserSite access instructionsNaunICE/Lyse Tele project codenameKjeragContractor project codename

Norwegian Operator Differences









































OperatorBOQ TemplateConfig FormatTSSR TemplateApproval FlowService CodesPricingICENaun/KjeragNMMM_, NLLL_KjeragSPL reviewsice_PM_xxxPer-itemTelenorTNOSimilarTelenorRegionalTNO_xxxFrameworkTeliaTELSimilarTeliaTeliaTEL_xxxFramework

File Format Reference

BOQ Export (.xlsx): Matches Naun template, 782 rows, quantities in column D, comments in E, metadata in rows 1–9, yellow cells editable, formulas preserved.
TSSR Export (.docx): Matches operator Word template, correct headings, tables, checkboxes, embedded photos, site plan, revision history, cover page.


Common Rejection Reasons

Config/quantity mismatch
Missing photos (antenna directions, site access)
Cable length inconsistency (material vs install service)
Wrong ACDB for earthing system
Missing GPS for Large config
Incomplete HSE section
Wrong antenna model for config
Missing crane justification
Non-standard battery config
Incomplete revision history


Use this file as a quick reference for terminology, section structure, product codes, and workflow best practices.
