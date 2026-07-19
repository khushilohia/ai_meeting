# Adding Features

## The shape of the codebase

One rule: **`web/src/lib/` holds logic, `web/src/app/api/` holds thin routes, pages read the DB directly (server components) and mutate via `fetch` (client components).** No ORM, no service layer, no state library — add one only when a concrete need arrives.

## Recipe: a new API endpoint

1. Create `web/src/app/api/<name>/route.ts`.
2. First line of every handler: `const user = requireUser(req); if (!user) return 401`.
3. Validate the body, return 400 with a message.
4. Scope every query by `user.id`.
5. Add a smoke-test curl to your PR (see the commit history — every step ships one).

```ts
import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const user = requireUser(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  // ...
}
```

## Recipe: a new DB column/table

Tables: add `CREATE TABLE IF NOT EXISTS` to the schema block in `web/src/lib/db.ts`.
Columns: append an `ALTER TABLE … ADD COLUMN` string to the migrations array in the same file — it's wrapped in try/catch so existing DBs no-op. There is no migration framework; don't add one until multiple deploys diverge.

## Recipe: a new Claude-powered feature

Add a function to `web/src/lib/claude.ts`. Conventions:
- Model: `claude-opus-4-8`. Latency-sensitive → `output_config: { effort: "low" }`; deep work (summaries) → `thinking: { type: "adaptive" }`.
- Structured output via `output_config.format` (json_schema) — never parse freeform text.
- Ground on retrieval: call `search(query, userId)` and pass chunks in; instruct "answer ONLY from context".

## Recipe: extension changes

`extension/` is plain JS, no build step — edit, then reload at `chrome://extensions`. Everything is in `sidepanel.js`; `background.js` only exists because `tabCapture.getMediaStreamId` must run in the service worker. Keep it that way until the panel outgrows one file.

## Known ceilings (marked `ponytail:` in code)

| Ceiling | Upgrade path when hit |
|---|---|
| Full-scan cosine search | Postgres + pgvector when a KB exceeds ~50k chunks |
| Tab-audio only (no local mic on some platforms) | Mix `getUserMedia` mic into the MediaRecorder stream |
| Single SQLite file | Postgres when you need >1 web instance |
| No team-shared KB | Add `team_id` to users/documents; share chunks by team scope |

## Testing conventions

- `npm run sanity` — pure-logic invariants, no keys, runs in CI-like contexts.
- `npm run phase0` — retrieval quality gate with real keys.
- Every feature lands with a curl-based smoke test against `npm start` (see git history for the pattern).
