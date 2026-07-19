# Debugging Guide

## Where things live

| Thing | Location |
|---|---|
| Database | `web/data/app.db` (SQLite, WAL mode). Inspect: `sqlite3 web/data/app.db '.tables'` |
| All backend logic | `web/src/lib/` (db, auth, chunking, embeddings, retrieval, claude) |
| All routes | `web/src/app/api/**/route.ts` — one file per endpoint, no middleware layers |
| Extension logs | side panel → right-click → Inspect → Console. Background worker: `chrome://extensions` → service worker link |

## Common failures

### "unauthorized" (401) from every API call
- Website: session expired (30 days) → sign in again.
- Extension: API token missing/rotated → Profile page → copy token → extension Settings.

### /api/ask answers "No knowledge base content yet"
The user has no chunks. Docs and meetings are **per-user** — check you're signed in as the account that uploaded them:
```sql
SELECT d.title, d.user_id, COUNT(c.id) FROM documents d LEFT JOIN chunks c ON c.document_id=d.id GROUP BY d.id;
```

### Voyage / Anthropic / Deepgram errors
Every provider call surfaces its HTTP status in the thrown error (`Voyage 401: …`). Check the key in `web/.env.local`, restart `npm run dev` (env is read at boot).

### Extension: transcript never appears
1. `Start copilot` must be clicked while the **call tab is active** (tabCapture works on the active tab).
2. Check the panel console for the Deepgram WS state. `Transcription error` → the backend's `DEEPGRAM_API_KEY` is bad, or the grant token expired before connect.
3. Tab capture gets **remote participants only** on some platforms (your own mic may be excluded). Known ceiling — see BUILD_PLAN Phase 3 note.

### "database is locked"
Multiple processes hit SQLite during writes. `busy_timeout=5000` + retry-on-BUSY are set in `web/src/lib/db.ts`; if you still see it, you probably have a stale `npm start`/`npm run dev` holding the DB — `lsof web/data/app.db`.

### Build fails / weird Next.js behavior
This repo uses **Next.js 16** — check `web/node_modules/next/dist/docs/` before assuming Next 13/14 conventions (e.g. `params` is a **Promise** in route handlers and pages).

## Debugging retrieval quality

Run the deterministic harness first: `npm run phase0` (seeds 3 docs, 10 planted questions, prints per-question retrieval hit + latency). If retrieval misses:
- Check chunk granularity (`web/src/lib/chunk.ts`, 1200 chars) — facts split across chunks won't match.
- Check score: `/api/search?q=...` returns raw cosine scores; below ~0.4 is noise.
- The `answer()` prompt in `web/src/lib/claude.ts` forces context-only answers; `confident:false` means retrieval didn't supply the fact.

## Latency budget (/api/ask target < 3s)

1 embed call (Voyage, ~100–200ms) + full-scan cosine (ms at small scale) + 1 Claude call (~1–2s at `max_tokens:1024`). If slow, check the Claude call first — it dominates.
