# SiteForge — Development Highlights (Phase 1–3)

## Phase 1: Backend Foundation & Core Pipeline

**Goal:** Replace client-side-only state with a persistent backend and real document export.

### PostgreSQL + FastAPI Backend
- Async FastAPI application with SQLAlchemy 2.0 async ORM, asyncpg, and Alembic migrations
- Full project CRUD with cascading relationships (project -> TSSR, BOQ items, photos)
- Health endpoint with database connectivity check
- CORS middleware, static file serving for uploads, Pydantic v2 schemas with camelCase aliases

### 782-Row BOQ Catalog
- Imported from the real Naun Excel template (BoQ_v4.01)
- Four sections: Products, Services, Griptel, Solar
- Searchable via `/api/catalog/search` with fuzzy matching across product code, description, category, vendor
- Stats endpoint returns totals, section counts, category and vendor breakdowns

### 27-Rule Dependency Engine
- Pure Python rule engine in `dependency_engine.py`
- Config string parser: `NLLL_` = new site with 3 large sectors, `LMS_` = existing upgrade with large/medium/small
- **22 radio plan rules:** site setup hardware (ABIO, ASIB, AMIA, AHEGB, AQQY per sector), antenna counts, jumper cables, downtilt kits, BBU/RRH install services, walk tests, TSS reports, labeling, commissioning, feeder cable, travel costs by region, GPS kits, SFP/SFP28 modules, DC plugs, mounting brackets, ATOA optical units
- **5 power calc rules:** rectifier modules, DC cables by cross-section, batteries, battery connect sets, ASAL cable
- BOQ compute endpoint: parses radio plan input -> runs all rules -> resolves against catalog -> diffs against existing items -> upserts to database

### TSSR Data Model (30+ Fields)
- Site identity, supporting documents, access info, TSSR alignment, radio config with sector data (JSONB), access & logistics, cabinet & power, HSE hazards, building info, cable routing, services, revision history, planned works, additional notes
- GET/PUT endpoints with full field sync to frontend

### TSSR Export — Two Formats
- **Legacy** (`format=legacy`): Loads the real OneCo Word template, finds Structured Document Tags by `w:tag` attribute, fills values. Handles two SDT XML layouts (runs directly in cells vs runs in paragraphs). 30+ field mappings in `tssr_template_map.py`. Supports TEXT, COMBOBOX, DROPDOWN SDT types plus positional plain_cell fallback.
- **Modern** (`format=modern`): Generates .docx from scratch (~856 lines in `tssr_template_generator.py`). Professional branded header, two-column table layout, proper SDT dropdowns/ComboBox content controls, footer with version and date.

### BOQ Export
- Fills the real Naun `.xlsm` template with openpyxl, preserving macros and VBA
- Writes metadata (site ID, name, operator, config) to header rows
- Maps each BOQ item to its exact row position via `row_index` + `sheet_name` from catalog
- Streams response as download

### Frontend Connected to Backend
- API client (`client.ts`) for all backend endpoints
- TSSR form auto-syncs to backend with 800ms debounce via `SiteContext.tsx`
- BOQ panel loads from backend catalog, supports add/remove/quantity edit
- Export dropdown in TopBar with TSSR (OneCo Template), TSSR (Modern), BOQ options
- Project list on HomeScreen loaded from `/api/projects`

### BOQ Live Panel
- `BOQSpreadsheetView` — table with sortable columns, editable quantity cells, category color-coding
- `BOQCardView` — category-grouped collapsible cards with item badges
- Section filters (Products/Services/Griptel/Solar), catalog search for adding new items

### TSSR Form Restructure
- `TSSRSidebar` — collapsible nav tree with completion indicators (complete/partial/empty) per section
- `TSSRContentArea` — dynamic section renderer mapping section IDs to components
- `SiteOverviewSection` — 3-panel grid: Site Identity + Access Logistics + Building Info
- `RadioPlanSection` — Excel upload with drag-drop, parsing results display
- `PowerCalcSection` — Excel upload, power/rectifier/battery metrics display
- Nav config in `tssr-nav-config.ts` with section metadata, required/optional fields, completion rules

### Radio Plan & Power Calc Parsers
- `radio-plan-parser.ts` — parses Excel radio plan files: sector aggregation, mount group calculation, config string generation, cell technology grouping
- `power-calc-parser.ts` — parses Effektkalkulator Excel files: power calculations, battery sizing, rectifier module count, DC cable schedules
- Both feed into the dependency engine for BOQ computation

### Dropdown Alignment
- All frontend dropdowns match the Word template's actual SDT options: Contractual Model, Version fields, Veiviser, Site Category, Building Type, Roof Type, Site Owner

### Validation Engine
- 7 cross-field validation rules (V001-V015): config vs sector count, RRH vs sectors, GPS kit for large configs, ACDB vs earthing system, jumper vs antenna ports, DC cable qty, walk test range
- Returns structured results with affected fields for UI indicators

---

## Phase 2: OneDrive Integration, Photos, Sketch & Workflow

**Goal:** Full document workflow with cloud sync, visual documentation, and review system.

### OneDrive Integration (Microsoft Graph API + MSAL)
- **OneDrive Import Flow** (`OneDriveImportFlow.tsx`) — multi-step wizard:
  1. Browse OneDrive folders with breadcrumb navigation
  2. Auto-detect files: Radio Plan (.xlsx), Effektkalkulator (.xlsx), site photos
  3. Select and confirm imports
  4. Auto-create project from Radio Plan data (parses sectors, antennas, cells, power config)
- **OneDrive Browser** (`OneDriveBrowser.tsx`) — standalone file browser with folder navigation, file search, categorization (TSSR/BOQ/Effekt/RadioPlan/Photo/Other), download, preview links
- **OneDrive Photo Browser** (`OneDrivePhotoBrowser.tsx`) — filtered photo view with bulk import to project
- **Export to OneDrive** — TSSR and BOQ exports saved directly to project's OneDrive folder with versioned filenames
- **Folder binding** — each project tracks `onedrive_folder_id` and `onedrive_folder_path`
- `graphService.ts` — Microsoft Graph API wrapper: listFiles, searchFiles, downloadFile, getFileMetadata, uploadAndGetEditUrl

### Photo Management System
- Backend: `project_photos` table with full metadata (section, sector, caption, annotations, EXIF compass, sort order, OneDrive item ID)
- Upload with thumbnail auto-generation (Pillow, EXIF-aware orientation)
- 15 TSSR-aligned categories (`photo-categories.ts`) with icons, min/max requirements, required flags
- Three views: grid, list, bucket (grouped by category)
- Search and filtering across photos
- Auto-filename generation: `{siteId}_{category}_{sector}_{seq}.{ext}`
- Sector-specific photo assignment
- OneDrive photo import (async download via httpx -> save -> thumbnail -> database)
- Photo reordering endpoint for drag-and-drop sorting

### Sketch Annotation Canvas
- Full drawing canvas overlay on site photos (`sketch/` directory)
- `SketchCanvas.tsx` — rendering, interaction, selection, pan/zoom, text input
- `SketchToolbar.tsx` — 10 tools: select, arrow, line, rectangle, circle, text, dimension line, freehand, zone, sticker
- `StickerBar.tsx` — telecom sticker library: 10 pre-made stickers (Sector A/B/C, Cabinet, ACDB, Crane, GPS, RRH, AQQY, Ground)
- `SketchStylePanel.tsx` — stroke/fill colors, stroke width, font size, opacity
- Zoom/pan controls, undo/redo with 50-item stack, keyboard shortcuts
- Annotations persist as JSONB on photo records
- Type definitions in `types/sketch.ts`

### Planned Works System
- `planned-works-generator.ts` — auto-generates TSSR Section 1.1 "Planned Works" from radio plan + power calc data
- Pure functions for 8+ sections: safety, site room, antenna, cable, power, grounding, testing, miscellaneous
- `PlannedWorksSection.tsx` — collapsible section viewer with editable work items and manual overrides
- Persists as JSONB on `project_tssr` (migration: `c3d4e5f6g7h8`)
- Type definitions in `types/planned-works.ts`

### Workflow System Enhancements
- Extended `WorkflowContext.tsx` with status transitions: Draft -> In Review -> Changes Requested -> Approved
- Role-based access: Maker (full editor), Checker (review mode), SPL (approve/reject)
- TopBar workflow controls, status badges, role switcher

### Export History & Versioning
- Tracks every export per project: type (tssr/tssr-modern/boq), version, destination (download/onedrive), filename, timestamp, OneDrive path
- Export version counters on project (`tssr_export_version`, `boq_export_version`)
- API endpoint to record export entries (migration: `g7h8i9j0k1l2`)

### Editor Layout Enhancements
- ONEDRIVE tab in LeftPanel for browsing/importing files
- Preview mode for live TSSR document preview
- `NavigationContext.tsx` for global navigation callbacks

---

## Phase 3: Build Tracking, As-Built & Dashboard Polish

**Goal:** Close the full lifecycle — survey -> document -> build -> as-built.

### Extended Status Lifecycle
- Added `Building` and `As-Built Complete` statuses (total: 6 states)
- `isAtLeastStatus(target)` helper using ordered status array for conditional UI gating
- `startBuild()` transition: Approved -> Building
- `completeAsBuilt()` transition: Building -> As-Built Complete
- TopBar shows status-appropriate action buttons and color-coded badges for all 6 states

### Build Task Checklist
- New BUILD tab in LeftPanel (visible when status >= Approved)
- `BuildMode.tsx` with two sub-views:
  - **Installation Tasks**: auto-generated from planned works sections, each work item becomes a checkable task with expandable note field
  - **Material Pick List**: all BOQ items with quantities, checkable with actual quantity tracking
- Tasks persist as JSONB on projects table via GET/PUT endpoints (migration: `h8i9j0k1l2m3`)
- Task auto-generation on first Build Mode open: iterates planned works + BOQ items
- TopBar shows build progress bar: "Build: 14/38 (37%)"
- Section grouping with colored progress bars and "N/M done" counts

### Actual vs Planned BOQ Tracking
- `actual_quantity` and `actual_comment` columns on BOQ items (migration: `i9j0k1l2m3n4`)
- Editable inline in Build Mode's Material Pick List (actual qty + comment per item)
- "Show Actuals" toggle in BOQ spreadsheet panel adds ACT Qty and ACT Comment columns
- Optimistic state updates in SiteContext + background API persist
- Deviation summary banner: "N items differ from planned" with expandable detail list
- BOQ export writes actuals to columns F (actual qty) and G (actual comment) in template

### As-Built Photo Capture
- Photos tagged with `phase`: "planning" or "as_built" (migration: `j0k1l2m3n4o5`)
- Phase toggle in Photos panel with Planning/As-Built buttons showing photo counts
- Default phase auto-selects based on project status (as-built when >= Approved)
- Backend filters photos by phase on upload, list, and OneDrive import
- Planning photos and as-built photos fully separated in all views

### As-Built Deviation Report
- `DeviationReportSection.tsx` — new section in TSSR navigation (visible when status >= Building)
- Three auto-populated sections:
  1. **BOQ Deviations** — items where actual quantity differs from planned, with product code, planned vs actual, and comment
  2. **Build Task Notes** — tasks with non-empty notes, showing section and task text
  3. **Free Text** — editable textarea synced to `deviations_free_text` on TSSR record (migration: `k1l2m3n4o5p6`)
- Conditional nav tree filtering via useMemo + isAtLeastStatus

### As-Built Export
- TSSR export with `?as_built=true`:
  - Adds "AS-BUILT DOCUMENTATION" heading with page break
  - Includes date, deviations free text
  - Embeds as-built photos in separate appendix (planning photos remain in main body)
  - Versioned filename: `{siteId}_TSSR_AsBuilt_v{nn}.docx`
  - Increments `as_built_tssr_version` counter
- BOQ export with `?as_built=true`:
  - Writes actual quantity and actual comment columns
  - Versioned filename: `{siteId}_BOQ_AsBuilt_v{nn}.xlsm`
  - Increments `as_built_boq_version` counter
- As-built version counters on projects (migration: `l2m3n4o5p6q7`)
- TopBar shows "As-Built" export section when status >= Building

### HomeScreen Dashboard Polish
- **Status filter bar:** All / Active / In Review / Building / Completed tabs with live counts
- **Project cards** replacing table rows:
  - Site ID (mono font) + status badge (6 colors for all statuses)
  - Site name, operator, relative time ("3h ago", "2d ago")
  - Export version badges (TSSR v03, BOQ v02) when exports exist
  - Build progress bar with percentage from build_tasks data
  - OneDrive folder path shown when linked
- **Search** across site ID, site name, operator
- **Sort** by Last Updated (default), Site Name, or Status
- **Context menu** (three-dot on hover): Open in Editor, OneDrive Folder, Delete
- **Empty states** for no projects and no filter matches

---

## Migration Chain (13 total)

```
Phase 1:
  c37d40824f3a  Initial schema (projects, tssr, boq_items, catalog 782 rows, rules)
  a1b2c3d4e5f6  TSSR first page fields (+15 columns)
  b2c3d4e5f6g7  Revision history (JSONB)

Phase 2:
  c3d4e5f6g7h8  Planned works (JSONB)
  d4e5f6g7h8i9  Photo management table (project_photos)
  e5f6g7h8i9j0  OneDrive fields + export versions
  f6g7h8i9j0k1  OneDrive item ID on photos
  g7h8i9j0k1l2  Export history (JSONB)

Phase 3:
  h8i9j0k1l2m3  Build tasks (JSONB)
  i9j0k1l2m3n4  BOQ actual quantity + comment
  j0k1l2m3n4o5  Photo phase (planning/as_built)
  k1l2m3n4o5p6  Deviations free text on TSSR
  l2m3n4o5p6q7  As-built version counters
```

## New Files Created

### Phase 1
| File | Purpose |
|------|---------|
| Entire `backend/` directory | FastAPI backend (models, routers, schemas, services, migrations, templates) |
| `frontend/src/app/api/client.ts` | REST API client |
| `frontend/src/app/components/BOQSpreadsheetView.tsx` | BOQ table view |
| `frontend/src/app/components/BOQCardView.tsx` | BOQ card view |
| `frontend/src/app/components/TSSRSidebar.tsx` | TSSR nav sidebar |
| `frontend/src/app/components/TSSRContentArea.tsx` | Dynamic section renderer |
| `frontend/src/app/components/sections/SiteOverviewSection.tsx` | Site overview |
| `frontend/src/app/components/sections/RadioPlanSection.tsx` | Radio plan import |
| `frontend/src/app/components/sections/PowerCalcSection.tsx` | Power calc import |
| `frontend/src/app/components/sections/import-shared.tsx` | Shared import UI |
| `frontend/src/app/lib/tssr-nav-config.ts` | Nav tree config |
| `frontend/src/app/lib/boq-rules.ts` | BOQ dependency rules |
| `frontend/src/app/lib/radio-plan-parser.ts` | Radio plan parser |
| `frontend/src/app/lib/power-calc-parser.ts` | Power calc parser |
| `frontend/src/app/lib/boq-export.ts` | BOQ export utilities |

### Phase 2
| File | Purpose |
|------|---------|
| `frontend/src/app/api/graphService.ts` | Microsoft Graph API |
| `frontend/src/app/components/OneDriveImportFlow.tsx` | OneDrive import wizard |
| `frontend/src/app/components/OneDriveBrowser.tsx` | OneDrive file browser |
| `frontend/src/app/components/OneDrivePhotoBrowser.tsx` | OneDrive photo browser |
| `frontend/src/app/components/sections/PlannedWorksSection.tsx` | Planned works viewer |
| `frontend/src/app/components/sketch/SketchCanvas.tsx` | Drawing canvas |
| `frontend/src/app/components/sketch/SketchToolbar.tsx` | Tool selector |
| `frontend/src/app/components/sketch/SketchStylePanel.tsx` | Style/color picker |
| `frontend/src/app/components/sketch/StickerBar.tsx` | Telecom sticker library |
| `frontend/src/app/context/NavigationContext.tsx` | Global navigation |
| `frontend/src/app/lib/msalConfig.ts` | Azure MSAL auth config |
| `frontend/src/app/lib/photo-categories.ts` | Photo categories metadata |
| `frontend/src/app/lib/planned-works-generator.ts` | Planned works generator |
| `frontend/src/app/lib/config-utils.ts` | Config string parser |
| `frontend/src/app/types/planned-works.ts` | Planned works types |
| `frontend/src/app/types/sketch.ts` | Sketch annotation types |
| `backend/app/models/photo.py` | Photo model |
| `backend/app/routers/photos.py` | Photo endpoints |
| `backend/app/schemas/photo.py` | Photo schemas |
| `backend/app/services/config_utils.py` | Config parser (backend) |

### Phase 3
| File | Purpose |
|------|---------|
| `frontend/src/app/components/modes/BuildMode.tsx` | Build task checklist |
| `frontend/src/app/components/sections/DeviationReportSection.tsx` | As-built deviations |

## Full Lifecycle

```
Import Radio Plan -> Fill TSSR -> Upload Photos -> Sketch Annotations
  -> Generate BOQ (27 rules) -> Validate -> Review -> Approve
    -> Start Build -> Check Tasks -> Track Actuals
      -> Capture As-Built Photos -> Record Deviations
        -> Complete As-Built -> Export Final Documents -> OneDrive
```

## By the Numbers

- **30+** TSSR data fields with two-way sync
- **782** catalog items across 4 sections
- **27** dependency engine rules
- **7** validation rules
- **15** photo categories
- **10** sketch annotation tools + 10 telecom stickers
- **6** workflow statuses
- **13** database migrations
- **50+** UI components (Radix/shadcn)
- **2** TSSR export formats (legacy template fill + modern generation)
- **2** BOQ export formats (standard + as-built with actuals)
