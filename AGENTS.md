This file is the single source of truth for how TSSR inputs map to BOQ quantities. It encodes the domain logic for Norwegian telecom base station deployments, as reflected in your real TSSR and BOQ templates. All rules are designed to work with the fixed-row Naun/Kjerag BOQ Excel and the TSSR structure you provided.

1. Config String & Site Identity
Config string is a direct input by the engineer (not auto-calculated). It encodes:

Site state (N = New, U = Upgrade)
Sector configuration (S = Small, M = Medium, L = Large)
Example: NLLL_ = New site, 3 sectors, all Large (LB+HB+MAA/n78)

Site identity (site name, ID, owner, customer, config string, access, iLOQ, etc.) is always visible and editable. These fields drive both TSSR and BOQ and are referenced in header rows of the BOQ and TSSR cover page.

2. Dependency Rules
2.1 Sector-Driven Rules

Sector count and sector configs (from config string) drive most hardware and service quantities.
For each sector:

S = 1 RRH (LB)
M = 1 RRH (LB) + 1 RRH (HB)
L = 1 RRH (LB) + 1 RRH (HB) + 1 RRH (MAA/n78)


Antenna, ATOA, jumpers, connectors, patch cables, rails, clamps, walk tests, install services all scale with sector count and config.
Product codes are mapped to the real Naun/Kjerag BOQ catalog (782 rows, fixed).

2.2 Config Size Rules

If any sector is Large (L):

Add GPS kit, cable, LNA, bracket (qty 1 each)
Add AQQY MAA RRH and SFP28 modules (qty = count of L sectors)
Add AMIA subrack, ASIB common, ABIO capacity (see TSSR for actual quantities)


If any sector is Medium (M):

Add ABIO capacity (qty 1)


Small config: minimal system modules only.

2.3 Cabinet & Power Rules

Driven by cabinet_type (Indoor/Outdoor) and site_category (Rooftop, Barn, Tower, etc.)
Map to real product codes for:

ACDB (TN/IT/TT, indoor/outdoor)
Rectifier (indoor/outdoor)
Earthing system
Battery (strings × 8, as per TSSR)
DCDU, EDP/OVP, smart meter, alarm cable



2.4 Cable Length Rules

Use actual cable lengths from TSSR tables:

cable_route_lengths[] (per sector, from TSSR)
cable_ladder_length (from TSSR)


Quantities:

Fiber, DC, ground cables, cable ladder, and install services all match TSSR values.
All mapped to BOQ rows by product code.



2.5 Site Category Rules

Rooftop + Gravitation: Ballast blocks (4 per mount), gravitation base (1 per sector)
Rooftop: Cable ladder, waterproofing kit
Barn: Wall mount, external cable protection
Tower: Climbing harness, clamp mount
Any + crane_needed: Crane service, mobilization

2.6 Fixed Per-Site Rules

Site commissioning, technician hours, documentation, fire sealing, alarm cable, etc.
Always present (unless manually overridden).

2.7 Conditional Rules

Painting, crane, safety, etc. triggered by TSSR fields (checkboxes, toggles).
Manual overrides always respected.


3. Validation Rules

All validation rules run after BOQ generation.
Cross-field checks (config string vs sector count, RRH vs sectors, GPS for Large, ACDB vs earthing, jumper count, cabinet vs site category, battery config, etc.)
Material-service consistency (fiber, DC, antenna, RRH install counts)
Reasonableness checks (walk tests, cable route, technician hours, total BOQ items)
All errors/warnings are surfaced in the frontend validation panel.


4. BOQ Excel Structure

The BOQ is a fixed 782-row Excel file.
Each BOQ item is mapped by product code and row index.
Quantities are set in column D; comments in column E.
All other columns are preserved from the template.
Export always writes to the same row positions; unused items remain at 0.


5. Cascading Update Behavior

On any TSSR field change:

Recalculate all affected BOQ items (unless manually overridden)
Diff old/new quantities, annotate changes
Run validation rules
Animate changed BOQ rows in the UI
Update TSSR preview if cross-document fields are affected




6. Cross-Document Relationships

BOQ changes update TSSR sections (e.g., sector count, RRH, cabinet, cable lengths, mounts, crane, HSE).
TSSR changes (e.g., sector config, cable tables, power) update BOQ quantities.
All mappings are explicit and traceable.


7. Known Gaps & Extensibility

Rules are based on real TSSR/BOQ pairs (e.g., Nørvevika 78).
Gaps: Tower rules, indoor/DAS, colocation, trunk fiber, SFP allocation for mixed configs, regional pricing, operator-specific templates.
All rules are extensible—add new mappings as more site types and templates are encountered.


8. Manual Overrides

Any BOQ quantity can be manually overridden in the UI.
Overridden items are not recalculated until the override is cleared.
All overrides are tracked with notes and audit trail.


9. Agentic Assistance

The agent can:

Suggest missing items based on TSSR context
Flag validation errors and offer one-click fixes
Explain mapping logic for any BOQ row
Accept natural language corrections (“Add 2 more sectors,” “Remove outdoor cabinet”)
Help with photo/sketch tagging and cross-referencing
