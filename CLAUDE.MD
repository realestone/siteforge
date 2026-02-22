# SiteForge

## What This Is

SiteForge is an internal tool for **Enerlista AS** (subcontractor within OneCo group) that automates TSSR (Technical Site Survey Report) and BOQ (Bill of Quantities) production for Norwegian telecom base station deployments. Target customer: ICE / Kjerag project.

Field engineers currently spend 4-8 hours per site manually producing Word and Excel documents. SiteForge reduces this to under 1 hour by parsing source data files (Radio Plan, Effektkalkulator), auto-generating equipment lists, and exporting to the operator's exact templates.

## Who Uses This

**Enerlista only.** OneCo and ICE/SPL see the exported files, not the tool.

- **Maker** — field engineer who visits sites, produces TSSR/BOQ, builds
- **Reviewer** — Enerlista colleague who checks before export to OneCo

The review/approval chain outside Enerlista (OneCo checker → ICE SPL) happens through Teams and Documaster. SiteForge's job is to make Enerlista's output fast and clean.

## What Works (verified against source code, Feb 2026)

### Core Pipeline — End to End
- **Radio Plan import** → `radio-plan-parser.ts` extracts site ID, config string, sectors, antenna types → auto-creates project → saves TSSR fields → runs dependency engine (~25 rules against 1605-row catalog) → persists BOQ items
- **Effektkalkulator import** → `power-calc-parser.ts` reads batteries, rectifiers, DC cables, breakers → 5 power rules map to catalog items → persisted
- **TSSR form editing** → 800ms debounce → `PUT /api/projects/{id}/tssr` → survives refresh
- **BOQ editing** → add/update/remove via individual API calls → manual overrides flagged and preserved on engine re-run
- **TSSR export** — two formats: legacy (fills real OneCo .docx template via SDT tags) and modern (generates from scratch). Both return valid .docx
- **BOQ export** — fills `BoQ_v4.01 template OneCo v4.xlsm` with `keep_vba=True`, writes quantities at correct row positions
- **Photo upload + management** — multipart upload, 400px thumbnails via Pillow, 15 TSSR-aligned categories, drag-and-drop, annotations as JSONB
- **Sketch annotation** — full canvas editor: 10 tools (arrow, rect, circle, text, dimension, freehand, zone, sticker), undo/redo, telecom stickers (Sector A/B/C, RRH, cabinet, GPS). Saves to JSONB
- **OneDrive browsing** — MSAL auth, Microsoft Graph API: browse folders, search, download, detect file types, upload with 423 retry

### Tech Stack
| Layer | Choice | Status |
|-------|--------|--------|
| Frontend | React 18, Vite, Tailwind v4, Radix UI, Motion | Running |
| Backend | FastAPI, Python 3.13, async SQLAlchemy, asyncpg | Running |
| Database | PostgreSQL + Alembic migrations | Running |
| Catalog | 1605-row BOQ catalog (420 products, 192 services, 750 Griptel, 243 solar) | Imported |
| Doc Export | python-docx (TSSR), openpyxl (BOQ .xlsm) | Working |
| OneDrive | MSAL + Microsoft Graph API | Working |
| AI | Not started | — |

### Run Commands
```
# Backend
cd backend && .venv/bin/uvicorn app.main:app --reload --port 8000

# Frontend
cd frontend && npm run dev    # port 5173
```

## What's Broken Right Now

1. **No project reload on refresh.** projectId lives in React state. Close tab = UI starts blank (data is safe in Postgres, just no way to load it back).

2. **HomeScreen is dead code.** `useState<Site[]>([])` — always empty. No project list, no selection, no way to open existing projects. The only entry point is importing a Radio Plan (which creates a new project every time).

3. **29 duplicate projects** in database from repeated Radio Plan imports with no dedup check.

4. **Config string hardcoded to `NLLL_` only.** The dependency engine's setup rules (racks, cabinets, GPS, grounding) only fire for "new site, 3 large sectors." Any other config gets zero setup items. Radio/power/antenna rules work generically.

5. **WorkflowContext is pure React state.** 6 fake users, zero backend persistence. Everything resets on refresh. Needs stripping down to 2 roles (Maker/Reviewer) with minimal persistence.

6. **Frontend BOQ fallback masks backend failures.** When backend is unreachable, `boq-rules.ts` silently runs client-side and populates UI with non-persisted items. No visual indicator.

7. **Photos don't appear in TSSR export.** The .docx has no images. Need: flatten annotations to JPEG, insert via python-docx at section positions.

## Target Workflow (OneDrive-First)

This is what we're building toward:

```
Phase 1: PROJECT SETUP (5 min)
  Open SiteForge → Connect OneDrive → Browse to site folder
  → SiteForge detects Radio Plan + Effektkalkulator
  → Kickstart dialog (site type, cabinet, crane, etc.)
  → Press Go → Skeleton generated

Phase 2: SITE VISIT
  Engineer on-site with visit sheet
  Photos to OneDrive via phone camera sync
  Measurements, observations, hazard notes

Phase 3: WORKSHOP (30-60 min)
  Open SiteForge → Select project → Skeleton pre-filled
  Green = auto-derived from RP/EK
  Yellow = engineer fills (cable routes, mounts, power board, hazards)
  Orange = verify on-site (building height, existing cables)
  BOQ updates live as TSSR changes
  Drag-assign photos from OneDrive into TSSR sections

Phase 4: ENERLISTA REVIEW
  Engineer marks ready → Colleague reviews inside SiteForge
  Comments, corrections → back to engineer if needed

Phase 5: EXPORT & HANDOFF
  Export TSSR .docx + BOQ .xlsm → saved to OneDrive project folder (versioned)
  OneCo picks up from OneDrive → reviews via Teams
  Feedback → engineer re-exports as next version

Phase 6: BUILD
  Technician opens SiteForge → task checklist from TSSR/BOQ
  Tracks actual vs planned quantities (ACT_Qty, ACT_Comment)

Phase 7: AS-BUILT
  As-built photos → OneDrive
  Update BOQ actuals → generate as-built TSSR/BOQ versions
  Export to OneDrive → OneCo submits to ICE via Documaster
```

## What Needs Building for This Workflow

| Gap | Effort | Priority |
|-----|--------|----------|
| Fix project reload on refresh (URL routing or localStorage) | 2 days | **P0 — blocks everything** |
| HomeScreen with real project list from backend | 2 days | **P0 — blocks everything** |
| Dedup check on Radio Plan import | 0.5 days | **P0** |
| OneDrive folder → auto-detect RP + EK → import | 2-3 days | **P1 — the demo moment** |
| Kickstart questionnaire modal (6-8 critical questions) | 2 days | **P1** |
| Export back to OneDrive (wire existing uploadFile to export) | 1 day | **P1 — closes the loop** |
| Project-to-OneDrive-folder binding (store folder ID on project) | 1-2 days | **P1** |
| Parameterize config string setup rules beyond NLLL_ | 2 days | **P1 — needed for real sites** |
| Browse OneDrive photos → assign to TSSR categories | 2 days | **P2** |
| Photos embedded in TSSR .docx export | 2-3 days | **P2** |
| Version suffix on exports in OneDrive | 0.5 days | **P2** |
| Strip WorkflowContext to Maker + Reviewer with persistence | 1-2 days | **P2** |

## Project Structure

```
frontend/
├── src/app/
│   ├── api/client.ts                  # All backend API calls
│   ├── components/
│   │   ├── SiteEditor.tsx             # Main editor layout (resizable panels)
│   │   ├── TopBar.tsx                 # Status, export dropdown
│   │   ├── LeftPanel.tsx              # FORM | PHOTOS | PREVIEW tabs
│   │   ├── RightPanel.tsx             # BOQ panel (card/spreadsheet views)
│   │   ├── TSSRSidebar.tsx            # VS Code-style section nav (288px)
│   │   ├── TSSRContentArea.tsx        # Dynamic section renderer
│   │   ├── BottomPanel.tsx            # Validation, comments, changes
│   │   ├── HomeScreen.tsx             # ⚠ DEAD CODE — needs rebuild
│   │   ├── OneDriveBrowser.tsx        # Graph API file browser
│   │   ├── sections/                  # 11 TSSR form sections
│   │   └── modes/
│   │       ├── PhotosMode.tsx         # Photo management + categories
│   │       ├── SketchMode.tsx         # Canvas annotation editor
│   │       └── PreviewMode.tsx        # TSSR preview + export buttons
│   ├── context/
│   │   ├── SiteContext.tsx            # Core state + backend sync (800ms debounce)
│   │   └── WorkflowContext.tsx        # ⚠ PURE REACT STATE — no persistence
│   ├── lib/
│   │   ├── tssr-nav-config.ts         # Sidebar nav tree + completion logic
│   │   ├── radio-plan-parser.ts       # Radio Plan .xlsx → sectors, site ID, config
│   │   ├── power-calc-parser.ts       # Effektkalkulator .xlsx → power items
│   │   ├── boq-rules.ts              # ⚠ Client-side BOQ fallback (masks backend failures)
│   │   ├── graphService.ts            # Microsoft Graph API wrapper
│   │   └── msalConfig.ts             # MSAL auth config
│   └── types/site.ts                  # TypeScript interfaces

backend/
├── app/
│   ├── main.py                        # FastAPI app, CORS, routers
│   ├── config.py                      # Settings (DB URL, template paths)
│   ├── database.py                    # Async SQLAlchemy engine + sessions
│   ├── models/
│   │   ├── project.py                 # projects table
│   │   ├── tssr.py                    # project_tssr (30+ columns)
│   │   ├── boq.py                     # project_boq_items (FK to catalog)
│   │   ├── catalog.py                 # boq_catalog (1605 rows)
│   │   └── rules.py                   # dependency_rules
│   ├── routers/
│   │   ├── projects.py                # GET/POST /api/projects
│   │   ├── tssr.py                    # GET/PUT + export (.docx)
│   │   ├── boq.py                     # CRUD + compute + export (.xlsm)
│   │   ├── catalog.py                 # Search, stats
│   │   ├── photos.py                  # Upload, thumbnails, annotations
│   │   └── health.py
│   ├── services/
│   │   ├── dependency_engine.py       # ~25 rules: RP+EK → BOQ quantities
│   │   ├── boq_service.py
│   │   ├── catalog_service.py
│   │   └── validation_service.py      # Cross-field checks
│   ├── tssr_template_map.py           # SDT tag → field mapping (legacy export)
│   └── tssr_template_generator.py     # Modern .docx generator (~450 lines)
├── scripts/import_catalog.py          # Naun Excel → PostgreSQL
├── alembic/                           # DB migrations
└── templates/                         # OneCo .docx + .xlsm templates
```

## Database

```sql
boq_catalog (1605 rows)
  id, row_index, product_code, description, category, subcategory, unit, vendor, sheet_name

projects
  id, site_id, site_name, operator, status, created_at, updated_at

project_tssr (30+ columns)
  id, project_id, config_string, sectors (JSONB), site_category, cabinet_type, ...

project_boq_items
  id, project_id, catalog_item_id, quantity, is_manual_override, override_note

dependency_rules
  id, catalog_product_code, rule_type, expression, parameters
```

## API Endpoints

```
GET/POST    /api/projects                    — list/create projects
GET/PUT     /api/projects/{id}/tssr          — TSSR CRUD
GET         /api/projects/{id}/tssr/export   — ?format=legacy|modern → .docx
GET/POST/PATCH/DELETE /api/projects/{id}/boq — BOQ item CRUD
POST        /api/projects/{id}/boq/compute   — run dependency engine
GET         /api/projects/{id}/boq/export    — .xlsm
POST        /api/projects/{id}/photos        — upload photo
GET         /api/projects/{id}/photos        — list photos
PATCH       /api/projects/{id}/photos/{pid}  — update category/annotations
GET         /api/catalog/search              — product search
GET         /api/catalog/stats               — catalog statistics
GET         /health                          — health check
```

## Source Data Files

**Radio Plan** (.xlsx) — columns: CellId, Technology, AntennaType, Height, Azim, MT, ET, FeedLen, CableType, Jumpers. CellId naming: `{SiteID}{Tech}{Band}_{Sector}`.

**Effektkalkulator** (.xlsx) — 8 sheets. Key inputs: sector counts (B22-B25), earthing system (B119), Ik values (B120-B121), cable length (B123). Key outputs: rectifier modules (B31), battery strings (B39), DC cable summary (B86-B95), breaker recommendations (B137, B160).

**TSSR Template** (.docx) — OneCo v6 with Structured Document Tags. Legacy export fills SDTs by tag name. Modern export generates from scratch.

**BOQ Template** (.xlsm) — Naun v4.01 with macros. 4 sheets: BoQ (782 rows), BoM Griptel (1014), BoM Solar (305), D365 ordering.

## Azure App Registration (OneDrive)
- Client ID: `cd5dd6ec-53a7-4192-adfe-b4c5aa184061`
- Authority: `https://login.microsoftonline.com/consumers`
- Permissions: User.Read, Files.ReadWrite.All (delegated)
- Redirect: `http://localhost:5173`

## Design Principles

1. **OneDrive is the single source of truth.** Files come from OneDrive, exports go back to OneDrive. SiteForge is the processing layer in between.
2. **Engineer is in control.** The tool warns but never blocks. Manual overrides always allowed.
3. **AI is an accelerator, not a dependency.** Config-driven generation works without AI. Full value if LLM is down.
4. **Less friction, not more features.** Every click should remove work, not add choices.
5. **Enerlista scope first.** Build for the maker/reviewer workflow. OneCo and ICE see exported files, not the tool.
