# Meeting Intelligence Copilot — Build Plan

Companion to [meeting-intelligence-prd.md](meeting-intelligence-prd.md). This is the engineering plan: stack, repo layout, and phase-wise prompts/todos.

## Stack

| Layer | Choice | Why (laziest thing that works) |
|---|---|---|
| Web app + backend | **Next.js 15 (App Router, TypeScript)** in `web/` | One codebase, one deploy. API routes ARE the backend — no separate server. |
| Database | **SQLite via better-sqlite3** (`web/data/app.db`) | Zero setup. Vector search = cosine similarity in JS over stored embeddings. Fine for KBs up to ~50k chunks. `ponytail:` swap to Postgres + pgvector when a single company KB outgrows memory. |
| LLM | **Claude Opus 4.8** (`@anthropic-ai/sdk`) | Answers, summaries, action items. Streaming for anything long. |
| Embeddings | **Voyage AI** (`voyage-3`, REST) | Anthropic-recommended; Claude API has no embeddings endpoint. Single `fetch` call, no SDK. |
| Live ASR | **Deepgram streaming (WebSocket)** | Extension connects *directly* to Deepgram using a short-lived key minted by our backend (`/api/deepgram-token`). We never proxy audio → no WS server of our own. |
| Extension | **Chrome Manifest V3** in `extension/`, built with Vite | One extension works on meet.google.com, zoom.us (web client), teams.microsoft.com. Side panel UI + `tabCapture` audio. |
| Auth | **None in Phase 0–1** (single-user, local) | `ponytail:` add Auth.js (Google OAuth) in Phase 2 when the team-shared KB arrives — that's the first feature that actually needs identities. |

## Repo layout

```
AI_meeting/
├── meeting-intelligence-prd.md
├── BUILD_PLAN.md
├── web/                  # Next.js — website + backend API
│   ├── src/lib/          # db, embeddings, claude, retrieval, chunking
│   ├── src/app/api/      # all backend routes
│   ├── src/app/          # frontend pages (Phase 4)
│   ├── scripts/          # phase0-retrieval-test.ts
│   └── data/app.db       # SQLite (gitignored)
└── extension/            # Chrome MV3 extension (Phase 5)
```

## API surface (the whole backend)

| Route | Method | Purpose |
|---|---|---|
| `/api/documents` | POST / GET | Upload a doc (text/markdown) → chunk → embed → store. List docs. |
| `/api/documents/[id]` | DELETE | Remove doc + its chunks. |
| `/api/ask` | POST | `{query, meetingId?}` → retrieve top chunks → Claude answers with sources. The core loop (manual lookup AND auto-surface both call this). |
| `/api/meetings` | POST / GET | Start a meeting / list meetings. |
| `/api/meetings/[id]` | GET | Meeting detail + transcript. |
| `/api/meetings/[id]/segments` | POST | Ingest transcript segments (batched from the extension). |
| `/api/meetings/[id]/end` | POST | Generate summary + action items; embed transcript into the KB. |
| `/api/search` | GET | `?q=` semantic + keyword search across all meetings & docs, with timestamps. |
| `/api/deepgram-token` | POST | Mint short-lived Deepgram key for the extension. |
| `/api/detect` | POST | (Phase 3) `{recentTranscript}` → is there an answerable question? → auto-surface via `/api/ask`. |

---

## Phase-wise prompts / todos

Each phase is written as a self-contained prompt you can hand to an engineer (or an agent). Do them in order; each phase ends runnable.

### Phase 0 — Prove retrieval (backend core) ✅ built
> Scaffold `web/` (Next.js + TS). Build: SQLite schema (documents, chunks, meetings, segments), chunking (~1200 chars, paragraph-aware), Voyage embeddings client, cosine-similarity retrieval, Claude answer generation with cited sources. Routes: `/api/documents`, `/api/ask`. Ship `scripts/phase0-retrieval-test.ts` that seeds sample docs, fires 8–10 planted questions, and reports retrieval accuracy + end-to-end latency. **Go/no-go gate per the PRD.**

- [ ] Run `npm run phase0` with real API keys; require ≥8/10 correct source retrieval and p50 latency < 3s before Phase 1.

### Phase 1 — Meetings backend ✅ built
> Add meetings CRUD, transcript segment ingestion (batch POST, ordered by timestamp), `/api/meetings/[id]/end` (Claude generates summary + action items; transcript gets chunked/embedded into the KB so past meetings are retrievable), and `/api/search` across meetings + docs returning `{source, snippet, timestamp, meetingId}`. Add `/api/deepgram-token`.

### Phase 2 — Website (Next.js frontend) ✅ built
> Build pages: **Dashboard** (`/`) — meeting list + search bar; **Meeting detail** (`/meetings/[id]`) — transcript, summary, action items; **Knowledge** (`/knowledge`) — upload/list/delete docs, test-query box; **Live** (`/live/[id]`) — running transcript + ask box (shares components with the extension panel). Use Tailwind, keep components in `src/components/`. No state library — server components + `fetch`; `useState` where needed.

### Phase 3 — Extension (the wedge) ✅ built
> Chrome MV3 in `extension/`. Side panel opens on meet.google.com / teams.microsoft.com / zoom.us. Flow: user clicks "Start" → background captures tab audio (`chrome.tabCapture`) → stream to Deepgram WS (token from `/api/deepgram-token`) → interim transcripts render live in the panel → finalized segments batched to `/api/meetings/[id]/segments` every ~5s. Panel has the manual **Ask** box → `/api/ask` (grounded answer + sources, <3s). "End meeting" → `/api/meetings/[id]/end` → shows summary. `ponytail:` tab-capture gets remote participants only (mic is muted in tab audio on some platforms); good enough for v1 — the user's own words matter less for recall. Upgrade path: `getUserMedia` mic mixing.

### Phase 3.5 — Auto-surfacing ✅ built
> Client timer: every ~10s of new transcript, POST last ~30s to `/api/detect`. Backend: one Haiku-class fast Claude call — "is there a question/topic here answerable from the KB? return the query or null" — if yes, run `/api/ask` and push a suggestion card into the panel (dismissible). Ship only after Phase 3 manual lookup proves quality (per PRD).

### Phase 4 — Depth (P1s) ✅ built (diarization, citations, editable transcript, bookmarks) — team KB + auth deferred
> Diarization: enable Deepgram `diarize=true`, store speaker per segment. Inline citations + confidence (source age) in answer cards. Editable transcript (inline edit → PATCH segment). Live bookmarks (button → flag segment). Team KB + Auth.js — first real need for auth.

---

## Env vars (`web/.env.local`)

```
ANTHROPIC_API_KEY=...
VOYAGE_API_KEY=...
DEEPGRAM_API_KEY=...
```
