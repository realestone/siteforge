# CLAUDE.md — SiteForge

## What Is This

SiteForge is a documentation platform for Norwegian telecom base station deployments. It replaces manual TSSR (Technical Site Survey Report) and BOQ (Bill of Quantities) production with a live, reactive workspace.

Field engineers currently spend 4-8 hours per site manually producing TSSR/BOQ document pairs in Word and Excel. SiteForge reduces this to under 1 hour through config-driven generation, real-time dependency propagation, and AI-assisted corrections.

## Target Users

Norwegian telecom subcontractors producing documentation for:
- Telenor
- Telia  
- ICE (Lyse Tele / Kjerag project)

Primary user: field engineer (maker). Secondary: internal reviewer (checker), operator contact (SPL), electrician, builder.

---

## Current State

### Frontend — Built (React)

The frontend is a working React application with an IDE-style layout:

```
┌─────────────────────────────────────────────────────────┐
│ TopBar: site name, status badge, workflow controls       │
├──────────────────────────┬──────────────────────────────┤
│ Left Panel               │ Right Panel                  │
│                          │                              │
│ Modes:                   │ BOQ Live View                │
│ • Form (TSSR sections)   │ • Grouped by category        │
│ • Photos (section sort)  │ • Change highlighting        │
│ • Sketch (site plan)     │ • Active/all toggle          │
│ • Preview (TSSR doc)     │ • Manual override support    │
│                          │ • Export button               │
├──────────────────────────┴──────────────────────────────┤
│ Bottom Panel: Validation | Comments | AI Chat | Changes  │
└─────────────────────────────────────────────────────────┘
```

**What works:**
- TSSR form with collapsible sections (site identity, radio config, access, building, power)
- Sector configuration table (azimuth, tilt, antenna, cable route per sector)
- BOQ auto-generation from TSSR inputs with live change tracking
- Validation engine with cross-field checks (6 rules implemented)
- Photo upload with drag-and-drop sorting into TSSR sections
- Sketch mode (UI shell, canvas not implemented)
- Workflow system with role-based access (maker → checker → SPL → builder)
- Comments panel with section targeting and thread resolution
- Electrical sign-off and builder task checklist

**What's wrong:**
- BOQ generation is hardcoded in JavaScript (`generateBOQFromTSSR` in SiteContext.tsx)
- Uses fake product codes and simplified categories, not the real 782-row Naun Excel catalog
- Config string is auto-calculated from sector count only (should be direct input)
- No backend — everything is client-side state that resets on refresh
- No persistence, no multi-user, no real export

### Backend — Not Started

Planned: FastAPI + PostgreSQL + pgvector. See Architecture section.

### Key Files

```
frontend/
├── src/app/
│   ├── components/
│   │   ├── SiteEditor.tsx          # Main editor layout (resizable panels)
│   │   ├── TopBar.tsx              # Status, workflow controls, export
│   │   ├── LeftPanel.tsx           # TSSR form + mode switcher
│   │   ├── RightPanel.tsx          # BOQ live view (grouped, animated)
│   │   ├── BottomPanel.tsx         # Validation, chat, changes, comments
│   │   ├── CommentsPanel.tsx       # Review comments with threads
│   │   ├── HomeScreen.tsx          # Project list
│   │   ├── sections/              # TSSR form sections
│   │   │   ├── RadioConfigSection.tsx
│   │   │   ├── SiteIdentitySection.tsx
│   │   │   ├── AccessLogisticsSection.tsx
│   │   │   ├── PowerGroundingSection.tsx
│   │   │   └── BuildingInfoSection.tsx
│   │   └── modes/                 # Left panel modes
│   │       ├── PhotosMode.tsx      # Photo sorting into TSSR sections
│   │       ├── SketchMode.tsx      # Site plan (shell only)
│   │       └── PreviewMode.tsx     # TSSR document preview
│   ├── context/
│   │   ├── SiteContext.tsx         # Core state: TSSR data, BOQ items, photos, sketch
│   │   └── WorkflowContext.tsx     # Roles, status, comments, reviews
│   └── types/
│       └── site.ts                # All TypeScript interfaces
├── package.json                    # React 18, Vite, Tailwind v4, Radix UI, Motion
└── vite.config.ts
```

---

## Architecture

```
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
  │ PostgreSQL       │    │ Claude API      │
  │ + pgvector       │    │ (swappable)     │
  │                  │    └─────────────────┘
  │ • BOQ catalog    │
  │ • Projects       │
  │ • Dependency rules│
  │ • Vector search  │
  └──────────────────┘
```

### Tech Stack

| Layer | Choice | Status |
|-------|--------|--------|
| Frontend | React 18, Vite, Tailwind v4, Radix UI, Motion | ✅ Built |
| Backend | FastAPI (Python) | ❌ Not started |
| Database | PostgreSQL + pgvector | ❌ Not started |
| AI | Claude API (abstracted via llm_service.py) | ❌ Not started |
| Doc Export | openpyxl (BOQ .xlsx), python-docx (TSSR .docx) | ❌ Not started |

### Data Flow (Target)

```
IMPORT:
  Master BOQ .xlsx → openpyxl parse → PostgreSQL (boq_catalog table)

RUNTIME:
  TSSR field change → FastAPI → dependency engine → update project_boq_items → push to frontend
  Manual BOQ edit → FastAPI → update with override flag → push to frontend

EXPORT:
  PostgreSQL → openpyxl writes quantities into template → .xlsx download
  PostgreSQL → python-docx fills TSSR template → .docx download
```

### Database Schema (Planned)

```
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
```

---

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

---

## Workflow System

```
Draft → Internal Review → Submitted → Approved → Building → As-Built Complete
                ↓              ↓
         Changes Requested   Rejected
```

| Role | Access | Permissions |
|------|--------|-------------|
| Maker (field engineer) | Full editor | Create, edit all, submit |
| Checker (senior engineer) | Review mode | Comment, approve/reject sections |
| SPL (operator contact) | Review mode | Approve/reject submission |
| Electrician | Power section only | Capacity check, sign-off |
| Builder | Read-only + tasks | View approved docs, mark tasks done |

---

## Design Principles

1. **AI is an accelerator, not a dependency.** Config-driven generation works without AI. The platform has full value if the LLM is down.

2. **Engineer is in control.** The tool warns but never blocks. Manual overrides always allowed.

3. **Excel is import/export format, not runtime format.** Database is single source of truth during editing. Excel comes in at start, goes out at end.

4. **Two control modes, one state.** Manual UI and AI chat both modify the same project state.

5. **IDE, not wizard.** Everything accessible at once. No forced step-by-step flow.

---

## Development Phases

### Phase 1 — Backend Foundation ← CURRENT
- [ ] PostgreSQL setup + BOQ catalog import from real Excel
- [ ] Dependency rules engine (config → quantities)
- [ ] FastAPI endpoints (project CRUD, TSSR update, BOQ serve/export)
- [ ] Connect frontend to backend (replace hardcoded generation)
- [ ] Fix config string to be direct input, not auto-calculated

### Phase 2 — Complete Frontend
- [ ] Sketch mode: equipment placement on photo/map overlay
- [ ] Photo annotations: SVG overlay with arrows, circles, measurements
- [ ] TSSR document export (.docx)
- [ ] Real Excel export matching Naun template structure

### Phase 3 — AI Layer
- [ ] LLM service wrapper (Claude API, swappable)
- [ ] System prompt with telecom domain knowledge
- [ ] Context injection (project state + catalog per request)
- [ ] Chat interface connected to real actions
- [ ] Vector embeddings for catalog semantic search (pgvector)

### Phase 4 — Intelligence & Scale
- [ ] Multi-operator template support (Telenor vs Telia vs ICE)
- [ ] Pattern recognition across projects
- [ ] Multi-user with auth
- [ ] Mobile view for on-site review
