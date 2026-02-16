# CLAUDE.md — Telecom Site Intelligence Platform

## Project Vision

An AI-powered platform for Norwegian telecom base station deployments that replaces manual TSSR (Technical Site Survey Report) and BOQ (Bill of Quantities) production with an intelligent, conversational workflow. Think Claude Code, but for telecom site planning.

Engineers interact through a combination of structured inputs and natural language conversation. The system generates, validates, and exports operator-compliant documentation while learning from every project.

## Target Market

Norwegian telecom operators and their contractors:
- Telenor
- Telia
- ICE (Lyse Tele)

Initial user: Field engineers and contractors producing TSSR/BOQ document pairs for base station deployments.

---

## Core Workflow

### Step 1 — Structured Input (No AI)
Engineer fills a simple form:
- **Site name** (e.g. OSL-69789)
- **Site type** (rooftop, barn, tower, greenfield)
- **Config string** (NMMM, NMM, NM, ULLL, UL, UM, US, NS, NSSS, NSS etc.)
- **Owner** (Telenor, Telia, ICE)

System generates a draft TSSR structure and BOQ with pre-filled materials and quantities based on config rules and catalog lookup. Deterministic, fast, no API cost.

### Step 2 — Dashboard Review
Engineer sees TSSR and BOQ side by side on a live dashboard. Everything pre-populated from config logic. Changes in one propagate to the other through the reactive dependency graph.

### Step 3 — Corrections (Two Paths)

**Manual path:** Click-to-edit UI. Change quantities, delete items, add from catalog browser. Traditional controls for engineers who prefer direct manipulation.

**AI path:** Conversational interface. Engineer says:
- "Remove the outdoor cabinet, site already has one"
- "What rectifier options do we have for this setup?"
- "Swap antenna bracket to heavy-duty version, 6 pieces"
- "Walk me through the electrical scope"

Both paths update the same project state. Both reflect live on the dashboard.

### Step 4 — Export
Generate final TSSR (.docx) and BOQ (.xlsx) in operator-specific format.

---

## Architecture

### Tech Stack

```
React (web)          ← Dashboard, AI chat, live BOQ/TSSR view
FastAPI (Python)     ← Backend API, document generation, AI orchestration
PostgreSQL + pgvector ← Material catalog, projects, AI knowledge base
Claude API           ← AI agent (abstracted for future LLM swap)
```

### System Diagram

```
┌─────────────────────────────────────────────────┐
│                 React Frontend                   │
│                                                  │
│  ┌──────────┐  ┌──────────┐  ┌───────────────┐  │
│  │ TSSR View│  │ BOQ View │  │   AI Chat     │  │
│  └────┬─────┘  └────┬─────┘  └───────┬───────┘  │
│       └──────────────┴────────────────┘          │
└───────────────────────┬──────────────────────────┘
                        │ REST / WebSocket
┌───────────────────────┴──────────────────────────┐
│                  FastAPI Backend                  │
│                                                   │
│  ┌────────────┐ ┌──────────┐ ┌────────────────┐  │
│  │ Config     │ │ Document │ │ AI Agent       │  │
│  │ Engine     │ │ Export   │ │ Orchestrator   │  │
│  └─────┬──────┘ └────┬─────┘ └───────┬────────┘  │
│        └──────────────┴───────────────┘           │
└───────────────┬───────────────────┬───────────────┘
                │                   │
    ┌───────────┴────────┐   ┌──────┴──────┐
    │ PostgreSQL         │   │ Claude API  │
    │ + pgvector         │   │ (swappable) │
    │                    │   └─────────────┘
    │ • Material catalog │
    │ • Project state    │
    │ • Engineer notes   │
    │ • Vector embeddings│
    └────────────────────┘
```

### Database: PostgreSQL + pgvector (Single DB)

One database serves both relational and vector needs:

**Relational** — Material catalog, project data, BOQ line items, config rules, export templates. Exact, queryable, auditable. Handles "add 6x bracket model A."

**Vector (pgvector extension)** — Semantic search over item descriptions, engineer notes, usage context. Handles "what bracket works best for a barn with limited roof space?"

Single source of truth. No sync problems. One deployment, one backup.

### AI Agent Layer

The LLM is abstracted behind a thin wrapper (`llm_service.py`) so the provider can be swapped (Claude → OpenAI or others) with minimal code change.

**Per-request flow:**
1. Frontend sends engineer's message to FastAPI
2. FastAPI gathers context — current project state from DB, relevant catalog items (vector search if fuzzy question)
3. FastAPI packages system prompt + context + message → sends to LLM
4. LLM responds with conversational text, structured action, or both
5. FastAPI executes any actions against the DB
6. Frontend updates the dashboard

**The AI does NOT come in at Step 1.** Initial template generation is pure deterministic logic. AI is an accelerator for corrections and exploration, not a dependency.

### Reactive Dependency Graph

Site configuration drives equipment quantities through dependency rules:

```
Config string (NMMM)
  → Parse: 3 macro sectors
    → 3x RRH units
    → 3x antenna brackets
    → fiber jumper quantities
    → mounting hardware
    → electrical requirements
    → installation service items
```

Changes propagate through the graph in real-time. Remove a sector → RRH count drops, fiber count adjusts, BOQ totals update, TSSR sections reflect the change. All live on the dashboard.

The graph engine runs in-memory during editing sessions. State is persisted to PostgreSQL on save.

---

## Data Model

### Material Catalog

Each item in the catalog is both structured data and AI-searchable knowledge:

```
Item:
  - item_code: "XR-400"
  - description: "Rectifier unit 400W outdoor"
  - category: "electrical"
  - subcategory: "power"
  - default_quantity_rules: {per_sector: 0, per_site: 1}
  - compatible_site_types: [rooftop, barn]
  - compatible_configs: [NMMM, NMM]
  - unit_price: optional
  - usage_context: "mostly ordered for barn sites with air antenna"  ← vector searchable
  - engineer_notes: []  ← accumulated over time
  - embedding: vector(1536)  ← generated from description + context
```

### Project

```
Project:
  - id
  - site_name: "KRS-041"
  - site_type: "rooftop"
  - config: "NMMM"
  - owner: "Telenor"
  - status: draft | review | approved | exported
  - created_at
  - updated_at
```

### BOQ Line Items

```
BOQItem:
  - id
  - project_id → Project
  - material_id → Material Catalog
  - section: "electrical"
  - quantity: 6
  - is_auto_generated: bool
  - is_manually_overridden: bool
  - override_note: "engineer added extra due to site conditions"
```

---

## Design Principles

### 1. Suggestions, Not Prescriptions
The system proposes based on what it knows. The engineer has full control to override anything. Nothing is locked. Think autocomplete, not autofill.

### 2. AI is an Accelerator, Not a Dependency
Step 1 (structured generation) works without any AI. The platform has full value even if the LLM is down. AI makes it faster and smarter, but never blocks the work.

### 3. Flexibility Over Rigidity
No hardcoded "config X always means exactly these 47 items." Config rules are soft defaults. Engineers can add, remove, swap anything. Every override teaches the system.

### 4. Learning From Usage
The catalog gets smarter over time:
- **Day one:** Import master BOQ catalog. Item codes, descriptions, categories.
- **Phase two:** Engineers annotate items with usage context as they work.
- **Phase three:** System recognizes patterns across projects automatically.

### 5. Two Control Modes, One State
Manual UI controls and AI chat both modify the same project state. Engineer can switch between them freely. Some prefer clicking, some prefer talking. Both are first-class.

---

## Development Phases

### Phase 1 — Foundation
- [ ] PostgreSQL + pgvector setup
- [ ] Material catalog schema and import from existing BOQ templates
- [ ] FastAPI project scaffold with basic CRUD endpoints
- [ ] Config parsing logic (config string → default material list)
- [ ] Simple React frontend with input form and BOQ table view
- [ ] Document export (TSSR .docx, BOQ .xlsx)

**Outcome:** Engineer fills form → gets pre-filled BOQ → manually edits → exports documents.

### Phase 2 — AI Layer
- [ ] LLM service wrapper (Claude API, swappable)
- [ ] System prompt with telecom domain knowledge
- [ ] Context injection (project state + catalog) per request
- [ ] Structured action parsing from LLM responses
- [ ] Chat interface in React frontend
- [ ] Vector embeddings for catalog items (pgvector)
- [ ] Semantic search for material recommendations

**Outcome:** Engineer can converse with AI to modify BOQ, get material suggestions, ask questions about the project.

### Phase 3 — Intelligence
- [ ] Usage context accumulation from completed projects
- [ ] Pattern recognition across similar sites
- [ ] "Sites like this usually need X" suggestions
- [ ] Engineer notes and annotations stored as searchable knowledge
- [ ] Validation warnings ("you removed the cabinet but kept the mounting kit")

**Outcome:** System gets smarter with every project completed.

### Phase 4 — Scale
- [ ] Multi-operator template support (Telenor vs Telia vs ICE formats)
- [ ] Multi-user access and project sharing
- [ ] Mobile-friendly view for on-site review
- [ ] API for integration with operator systems
- [ ] Dashboard analytics across projects

**Outcome:** Platform ready for the broader Norwegian telecom market.

---

## Key Technical Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Database | PostgreSQL + pgvector | Single DB for relational + vector. No sync issues. Sufficient scale for years. |
| Backend | FastAPI (Python) | Same ecosystem as document generation libs (python-docx, openpyxl), Claude SDK, pgvector. Async support. |
| Frontend | React (web) | Desktop-first experience. Split panel dashboard. No app store dependency. |
| AI Provider | Claude API (abstracted) | Swappable to OpenAI or others via thin wrapper. No vendor lock-in. |
| Document Gen | python-docx + openpyxl | Direct programmatic control over TSSR/BOQ output formats. |
| Deployment | TBD | Docker Compose for dev. Cloud deployment TBD based on scale needs. |

---

## Config String Reference

```
N = Nokia vendor
M = Macro sector
m = Micro sector (if applicable)

NMMM  = Nokia, 3 macro sectors
NMM   = Nokia, 2 macro sectors
NM    = Nokia, 1 macro sector

Each macro sector typically requires:
  - 1x RRH unit
  - 1x Antenna + bracket
  - Fiber jumpers (quantity varies by setup)
  - Mounting hardware
  - Associated installation service items
```

*Config parsing rules are soft defaults, not hard constraints.*

---

## File Structure (Planned)

```
site-forge/
├── backend/
│   ├── main.py                 # FastAPI app entry
│   ├── config.py               # Environment config
│   ├── models/                 # SQLAlchemy / DB models
│   │   ├── project.py
│   │   ├── material.py
│   │   └── boq_item.py
│   ├── routers/                # API endpoints
│   │   ├── projects.py
│   │   ├── materials.py
│   │   ├── boq.py
│   │   ├── export.py
│   │   └── chat.py
│   ├── services/
│   │   ├── llm_service.py      # AI wrapper (swappable)
│   │   ├── config_engine.py    # Config → material defaults
│   │   ├── graph_engine.py     # Reactive dependency propagation
│   │   └── export_service.py   # TSSR/BOQ document generation
│   ├── catalog/                # Seed data
│   │   └── master_boq.json
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── TSSRView.jsx
│   │   │   ├── BOQView.jsx
│   │   │   ├── ChatPanel.jsx
│   │   │   ├── SiteForm.jsx
│   │   │   └── CatalogBrowser.jsx
│   │   ├── hooks/
│   │   ├── services/
│   │   └── App.jsx
│   └── package.json
├── docker-compose.yml
├── CLAUDE.md                    # This file
└── README.md
```

---

## Open Questions

- Exact TSSR section hierarchy per operator — need to map from real documents
- BOQ master catalog import format — parse from existing .xlsx templates
- Hosting/deployment strategy — self-hosted vs cloud
- Authentication — needed for multi-user, not for solo MVP
- Pricing model — per document pair, subscription, or per-seat
