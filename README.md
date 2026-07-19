# Meeting Intelligence Copilot

A live meeting copilot: company-aware answers **during** Meet/Teams/Zoom calls, plus a searchable record afterwards. See [meeting-intelligence-prd.md](meeting-intelligence-prd.md) (product) and [BUILD_PLAN.md](BUILD_PLAN.md) (engineering plan).

## What's in this repo

| Path | What it is |
|---|---|
| `web/` | Next.js 16 app — the website **and** the entire backend (API routes). SQLite storage. |
| `extension/` | Chrome MV3 extension — side panel that captures call audio, streams live transcript, answers questions. |
| `docker-compose.yml` | One-command production run of the web app. |
| `docs/` | [Debugging](docs/DEBUGGING.md) and [adding features](docs/ADDING_FEATURES.md). |

## Quick start (local dev)

```bash
cd web
cp .env.example .env.local   # fill in the three keys below
npm install
npm run dev                  # http://localhost:3000
```

Required keys in `web/.env.local`:

| Var | Get it from | Used for |
|---|---|---|
| `ANTHROPIC_API_KEY` | platform.claude.com | Answers, summaries, detection (Claude Opus 4.8) |
| `VOYAGE_API_KEY` | voyageai.com | Embeddings for retrieval |
| `DEEPGRAM_API_KEY` | deepgram.com | Live transcription |

Then: register at `/register`, add docs at `/knowledge`, and test a query.

## Install the extension

1. `chrome://extensions` → enable Developer mode → **Load unpacked** → select `extension/`.
2. Open the website → **Profile** → copy your **Extension API token**.
3. Click the extension icon → Settings → paste the token (and API base if not `http://localhost:3000`).
4. Join a Meet/Teams/Zoom call in a tab → open the panel → **Start copilot**.

## Run with Docker

```bash
export ANTHROPIC_API_KEY=... VOYAGE_API_KEY=... DEEPGRAM_API_KEY=...
docker compose up --build    # http://localhost:3000; SQLite persisted in a named volume
```

## Tests

```bash
cd web
npm run sanity   # no keys needed: chunking + cosine invariants
npm run phase0   # needs keys: seeds docs, 10 planted questions, reports retrieval accuracy + latency
```

`phase0` is the PRD's go/no-go gate: **≥ 8/10 retrieval and p50 < 3s**.

## Architecture (60 seconds)

```
extension (side panel)                    web (Next.js)
  tabCapture audio ──► Deepgram WS          ├─ /api/* = the backend (auth, KB, meetings, ask)
  finalized segments ──────────────────────►│    SQLite (data/app.db) + in-process cosine search
  Ask box / auto-detect ───────────────────►│    Claude Opus 4.8 (answers, summaries, detection)
                                            └─ pages: dashboard, meeting detail, knowledge, live
```

- **Retrieval**: docs and finished-meeting transcripts are chunked (~1200 chars), embedded (Voyage), stored as blobs in SQLite. Search = cosine over a full scan (fine to ~50k chunks; swap to pgvector beyond that).
- **Auth**: scrypt-hashed passwords, session cookie for the website, `Bearer <api_token>` for the extension. All data is per-user.
- **Audio never touches our server**: the extension streams straight to Deepgram with a short-lived token minted by `/api/deepgram-token`.
