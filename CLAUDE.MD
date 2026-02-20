Your CLAUDE.md is already very strong—clear, modular, and developer-friendly. Here are some nuanced improvements and adjustments based on our discussion and best practices for building a robust, scalable, and user-centric end-to-end flow:

***

## SiteForge — Enhanced CLAUDE.md

### What Is This

SiteForge is a documentation platform for Norwegian telecom base station deployments. It replaces manual TSSR (Technical Site Survey Report) and BOQ (Bill of Quantities) production with a live, reactive workspace.

Field engineers currently spend 4–8 hours per site manually producing TSSR/BOQ document pairs in Word and Excel. SiteForge reduces this to under 1 hour through config-driven generation, real-time dependency propagation, and AI-assisted corrections.

***

## Target Users

Norwegian telecom subcontractors producing documentation for:

*   Telenor
*   Telia
*   ICE (Lyse Tele / Kjerag project)

**Primary user:** field engineer (maker).  
**Secondary:** internal reviewer (checker), operator contact (SPL), electrician, builder.

***

## Current State

### Frontend — Built (React)

The frontend is a working React application with an IDE-style layout:

    ┌─────────────────────────────────────────────────────────────┐
    │ TopBar: site name, status badge, workflow controls          │
    ├───────────────┬───────────────────────────────┬─────────────┤
    │ Agent Panel   │ Main Workspace                │ BOQ Panel   │
    │ (collapsible) │ (TSSR form, photos, sketch,   │ (live,      │
    │               │ preview, comments, AI chat)   │ interactive)│
    ├───────────────┴───────────────────────────────┴─────────────┤
    │ Bottom Panel: Validation | Comments | AI Chat | Changes     │
    └─────────────────────────────────────────────────────────────┘

**What works:**

*   TSSR form with collapsible/expandable sections (site identity, radio config, access, building, power)
*   Sector configuration table (azimuth, tilt, antenna, cable route per sector)
*   BOQ auto-generation from TSSR inputs with live change tracking
*   Validation engine with cross-field checks (6 rules implemented)
*   Photo upload with drag-and-drop sorting into TSSR sections
*   Sketch mode (UI shell, canvas not implemented)
*   Workflow system with role-based access (maker → checker → SPL → builder)
*   Comments panel with section targeting and thread resolution
*   Electrical sign-off and builder task checklist

**What needs improvement:**

*   BOQ generation still has hardcoded rules in JS (`generateBOQFromTSSR` in SiteContext.tsx) — backend dependency engine stub exists but not wired
*   Config string is auto-calculated from sector count only (should be direct input)
*   No real-time collaboration or agentic assistance yet
*   Sketch mode canvas not implemented (UI shell only)

**What's been fixed (previously listed as missing):**

*   ~~No backend~~ — FastAPI backend built and running with full CRUD + export
*   ~~No persistence~~ — PostgreSQL with auto-sync from frontend (800ms debounce)
*   ~~Fake product codes~~ — Real 782-row Naun Excel catalog imported
*   ~~No real export~~ — TSSR .docx (two formats) and BOQ .xlsm export working

***

### Backend — Built & Running (FastAPI + PostgreSQL)

The backend is a working FastAPI application with full CRUD, export, and catalog:

    backend/
    ├── app/
    │   ├── main.py                    # FastAPI app, CORS, router registration
    │   ├── config.py                  # Settings (DB URL, template paths)
    │   ├── database.py                # Async SQLAlchemy engine + session
    │   ├── models/                    # SQLAlchemy ORM models
    │   │   ├── project.py             # Projects table
    │   │   ├── tssr.py                # ProjectTSSR (30+ columns)
    │   │   ├── boq.py                 # ProjectBOQItem (FK to catalog)
    │   │   ├── catalog.py             # BOQ catalog (782 rows)
    │   │   └── rules.py               # Dependency rules (planned)
    │   ├── routers/
    │   │   ├── projects.py            # GET/POST /api/projects
    │   │   ├── tssr.py                # GET/PUT /api/projects/{id}/tssr + export
    │   │   ├── boq.py                 # CRUD /api/projects/{id}/boq + export
    │   │   ├── catalog.py             # GET /api/catalog/search, stats
    │   │   └── health.py              # Health check
    │   ├── schemas/                   # Pydantic request/response models
    │   ├── services/                  # Business logic
    │   │   ├── boq_service.py         # BOQ operations
    │   │   ├── catalog_service.py     # Catalog search
    │   │   ├── dependency_engine.py   # TSSR→BOQ rules (stub)
    │   │   └── validation_service.py  # Cross-field validation
    │   ├── tssr_template_map.py       # SDT tag→db_field mapping for legacy export
    │   └── tssr_template_generator.py # Modern .docx generator (~450 lines)
    ├── scripts/
    │   └── import_catalog.py          # Import 782-row Naun Excel → PostgreSQL
    ├── alembic/                       # DB migrations (2 applied)
    └── pyproject.toml                 # FastAPI, SQLAlchemy, asyncpg, openpyxl, python-docx

**What works:**

*   PostgreSQL with 782-row BOQ catalog imported from real Naun Excel
*   Full TSSR CRUD (30+ fields including site identity, supporting docs, access, alignment)
*   TSSR .docx export — two formats: legacy (fills OneCo template via SDT tags) and modern (generates new template)
*   BOQ .xlsm export (fills real Naun template preserving macros/formulas)
*   BOQ item management (add from catalog, edit quantities, manual overrides)
*   Catalog search and stats endpoints
*   Frontend auto-syncs TSSR form data to backend (800ms debounce)
*   Alembic migrations for schema evolution

**What's not done:**

*   Dependency rules engine (TSSR field change → auto BOQ quantity updates) — stub exists
*   AI layer (no LLM integration yet)
*   pgvector / semantic search

***

## Key Files

    frontend/
    ├── src/app/
    │   ├── api/
    │   │   └── client.ts               # API client (catalog, BOQ, TSSR, export)
    │   ├── components/
    │   │   ├── SiteEditor.tsx           # Main editor layout (resizable panels)
    │   │   ├── TopBar.tsx              # Status, workflow controls, export dropdown
    │   │   ├── LeftPanel.tsx           # Tab bar (FORM|PHOTOS|PREVIEW) + content
    │   │   ├── RightPanel.tsx          # BOQ panel (card/spreadsheet views)
    │   │   ├── TSSRSidebar.tsx         # 288px VS Code-style section nav tree
    │   │   ├── TSSRContentArea.tsx     # Dynamic section renderer
    │   │   ├── BottomPanel.tsx         # Validation, chat, changes, comments
    │   │   ├── CommentsPanel.tsx       # Review comments with threads
    │   │   ├── HomeScreen.tsx          # Project list
    │   │   ├── sections/               # TSSR form sections (11 total)
    │   │   │   ├── SiteIdentitySection.tsx
    │   │   │   ├── SupportingDocsSection.tsx
    │   │   │   ├── AccessLogisticsSection.tsx
    │   │   │   ├── TSSRAlignmentSection.tsx
    │   │   │   ├── RadioConfigSection.tsx
    │   │   │   ├── BuildingInfoSection.tsx
    │   │   │   ├── PowerGroundingSection.tsx
    │   │   │   ├── SafetyChecksSection.tsx
    │   │   │   ├── CablesSection.tsx
    │   │   │   ├── AntennaMountsSection.tsx
    │   │   │   ├── OtherTasksSection.tsx
    │   │   │   └── SiteOverviewSection.tsx  # 3-panel combined view
    │   │   └── modes/
    │   │       ├── PhotosMode.tsx      # Photo sorting into TSSR sections
    │   │       ├── SketchMode.tsx      # Site plan (shell only)
    │   │       └── PreviewMode.tsx     # TSSR document preview
    │   ├── context/
    │   │   ├── SiteContext.tsx         # Core state + backend sync (800ms debounce)
    │   │   └── WorkflowContext.tsx     # Roles, status, comments, reviews
    │   ├── lib/
    │   │   └── tssr-nav-config.ts     # Sidebar nav tree data + completion logic
    │   └── types/
    │       └── site.ts                # All TypeScript interfaces
    ├── package.json                    # React 18, Vite, Tailwind v4, Radix UI, Motion
    └── vite.config.ts

***

## Architecture

    ┌─────────────────────────────────────────────────┐
    │                 React Frontend                   │
    │  TSSR Form  |  BOQ Live View  |  AI Chat        │
    └───────────────────────┬──────────────────────────┘
                            │ REST / WebSocket
    ┌───────────────────────┴──────────────────────────┐
    │                  FastAPI Backend                  │
    │  Config Engine  |  Doc Export  |  AI Orchestrator │
    └──────────┬────────────────────────┬──────────────┘
               │                        │
      ┌────────┴─────────┐    ┌────────┴────────┐
      │ PostgreSQL       │    │ Azure OpenAI    │
      │ + pgvector       │    │ (swappable)     │
      │                  │    └─────────────────┘
      │ • BOQ catalog    │
      │ • Projects       │
      │ • Dependency rules│
      │ • Vector search  │
      └──────────────────┘

***

### Tech Stack

| Layer      | Choice                                         | Status        |
| ---------- | ---------------------------------------------- | ------------- |
| Frontend   | React 18, Vite, Tailwind v4, Radix UI, Motion  | ✅ Built       |
| Backend    | FastAPI (Python 3.13)                          | ✅ Built       |
| Database   | PostgreSQL + Alembic migrations                | ✅ Running     |
| Catalog    | 782-row Naun BOQ catalog imported              | ✅ Imported    |
| Doc Export | openpyxl (BOQ .xlsm), python-docx (TSSR .docx) | ✅ Working     |
| AI         | Azure OpenAI (abstracted via llm\_service.py)  | ❌ Not started |
| pgvector   | Vector semantic search for catalog             | ❌ Not started |

***

### Data Flow (Target)

    IMPORT:
      Master BOQ .xlsx → openpyxl parse → PostgreSQL (boq_catalog table)

    RUNTIME:
      TSSR field change → FastAPI → dependency engine → update project_boq_items → push to frontend
      Manual BOQ edit → FastAPI → update with override flag → push to frontend

    EXPORT:
      PostgreSQL → openpyxl writes quantities into template → .xlsx download
      PostgreSQL → python-docx fills TSSR template → .docx download

***

### Database Schema (Planned)

    boq_catalog          — Master template rows from Naun Excel (782 rows)
      id, row_index, product_code, description, category, subcategory, unit, vendor, sheet_name

    projects             — Individual site projects
      id, site_id, site_name, operator, status, created_at, updated_at

    project_tssr         — TSSR inputs per project  
      id, project_id, config_string, sectors, site_category, cabinet_type, ...

    project_boq_items    — Per-project quantities (FK to catalog)
      id, project_id, catalog_item_id, quantity, is_manual_override, override_note

    dependency_rules     — Maps TSSR fields to catalog items
      id, catalog_product_code, rule_type, expression, parameters

***

## Core Workflow

### Step 1 — Structured Input (No AI)

Engineer fills: site name, site type, config string, owner.
System generates draft TSSR + BOQ from config rules and catalog lookup.
Deterministic, fast, no API cost.

### Step 2 — Dashboard Review

Engineer sees TSSR and BOQ side by side. Everything pre-populated.
Changes in one propagate to the other through dependency rules.

### Step 3 — Corrections (Two Paths)

**Manual:** Click-to-edit UI, dropdowns, quantity fields.  
**AI chat:** "Remove the outdoor cabinet, site already has one."  
Both update same state. Both reflect live.

### Step 4 — Review & Export

Internal review with comments → operator submission → approval → build.
Export final TSSR (.docx) and BOQ (.xlsx) in operator format.

***

## Workflow System

    Draft → Internal Review → Submitted → Approved → Building → As-Built Complete
                    ↓              ↓
             Changes Requested   Rejected

| Role        | Access            | Permissions                         |
| ----------- | ----------------- | ----------------------------------- |
| Maker       | Full editor       | Create, edit all, submit            |
| Checker     | Review mode       | Comment, approve/reject sections    |
| SPL         | Review mode       | Approve/reject submission           |
| Electrician | Power section     | Capacity check, sign-off            |
| Builder     | Read-only + tasks | View approved docs, mark tasks done |

***

## Design Principles

1.  **AI is an accelerator, not a dependency.** Config-driven generation works without AI. The platform has full value if the LLM is down.
2.  **Engineer is in control.** The tool warns but never blocks. Manual overrides always allowed.
3.  **Excel is import/export format, not runtime format.** Database is single source of truth during editing. Excel comes in at start, goes out at end.
4.  **Two control modes, one state.** Manual UI and AI chat both modify the same project state.
5.  **IDE, not wizard.** Everything accessible at once. No forced step-by-step flow.
6.  **Panels are flexible.** Agentic and BOQ panels are collapsible/extendable for maximum workspace flexibility.
7.  **Visual documentation is first-class.** Photos, sketches, and annotations are integrated into the main flow, not an afterthought.

***

## Development Phases

### Phase 1 — Backend Foundation (~80% DONE)

*   [x] PostgreSQL setup + BOQ catalog import from real Naun Excel (782 rows)
*   [x] FastAPI endpoints (project CRUD, TSSR CRUD, BOQ CRUD, catalog search)
*   [x] Connect frontend to backend (auto-sync with 800ms debounce)
*   [x] TSSR .docx export — two formats: legacy (fill OneCo template) + modern (generate new)
*   [x] BOQ .xlsm export (fill real Naun template preserving macros)
*   [x] VS Code-style sidebar nav with 8 TSSR sections + completion indicators
*   [x] Frontend dropdowns aligned with Word template SDT options
*   [ ] Dependency rules engine (config → auto BOQ quantities) — stub exists
*   [ ] Config string as direct input, not auto-calculated

### Phase 2 — Complete Frontend ← CURRENT

*   [ ] Sketch mode: equipment placement on photo/map overlay
*   [ ] Photo annotations: SVG overlay with arrows, circles, measurements
*   [x] TSSR document export (.docx) — done (two formats)
*   [x] Real Excel export matching Naun template structure — done

### Phase 3 — AI Layer

*   [ ] LLM service wrapper (Azure OpenAI, swappable)
*   [ ] System prompt with telecom domain knowledge
*   [ ] Context injection (project state + catalog per request)
*   [ ] Chat interface connected to real actions
*   [ ] Vector embeddings for catalog semantic search (pgvector)

### Phase 4 — Intelligence & Scale

*   [ ] Multi-operator template support (Telenor vs Telia vs ICE)
*   [ ] Pattern recognition across projects
*   [ ] Multi-user with auth
*   [ ] Mobile view for on-site review

***

## Nuanced Improvements & Recommendations

*   **Agentic Assistance:**
    *   Integrate Azure OpenAI for context-aware suggestions, error checking, and natural language commands.
    *   Agent panel is collapsible and can be pinned for always-on help.

*   **Live BOQ Panel:**
    *   Use SheetJS or similar for real Excel-like interaction.
    *   Allow manual overrides with clear visual indicators and audit trail.

*   **Visual Documentation:**
    *   Sketching and photo annotation are core features, not add-ons.
    *   All visual assets are linked to relevant TSSR sections and included in exports.

*   **Flexible Layout:**
    *   Panels (Agent, BOQ, Comments) are resizable and collapsible for maximum user control.
    *   Dual-column or split-section layouts for related info (e.g., Site Identity + Access) to reduce context switching.

*   **Persistence & Collaboration:**
    *   Real-time saving, multi-user editing, and change history are priorities for production.

*   **Export:**
    *   Exports match operator templates exactly, including all visual and annotated content.

***
