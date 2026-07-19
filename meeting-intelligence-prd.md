# PRD — Meeting Intelligence Copilot (working title)

**One-line pitch:** A live meeting copilot that gives professionals company-aware context and answers *during* the meeting — not just notes after it — plus a searchable post-meeting record.

**Status:** Draft v0.2 · Standalone product · English-first

---

## Problem Statement

Professionals who already use meeting-notes tools get all their value *after* the meeting — they review the transcript, then start work. But the highest-stakes moment is live: a client or colleague asks a question, and the user has to answer from memory, without the company's own data in front of them. Existing transcription tools (Otter, Fireflies, Google Meet) are built for after-the-fact review; none of them arm the user with context *while they're speaking*. The cost is real: weaker answers in the room, deals or decisions that hinge on recall instead of fact, and no compounding memory across meetings — every meeting starts from zero.

## Target Users

- **Primary:** Professionals in recurring external or internal meetings — sales, customer success, consulting, founders — who need to answer questions accurately in real time and would benefit from their own company's knowledge surfaced live.
- **Secondary:** Anyone who wants a reliable, searchable memory across all their meetings, so context compounds instead of resetting each time.

## Goals

1. Give users a measurable answer-quality edge *during* the meeting by surfacing company-context-grounded facts in real time.
2. Make every past meeting searchable and referenceable — no meeting's context is ever lost.
3. Eliminate the after-meeting scramble: summary and action items ready the moment the meeting ends.
4. Do all of this without ever putting words in the user's mouth — support recall, not scripting.

## Non-Goals (v1)

- **No scripted "say this exact sentence" response generation.** The copilot surfaces facts and talking points; the user speaks in their own words. (Design principle, not just a scope cut — revisit deliberately later, if ever.)
- **No code-switched / multilingual ASR.** English-first for v1; multilingual is a deliberate Phase 3 expansion into a new user base, not part of proving this wedge.
- **No autonomous agent that performs tasks during the meeting.** Out of scope until the core copilot is proven.
- **No CRM/calendar write-back in v1** (read/ingest yes, write-back later).

## Core User Stories

- As a professional in a live meeting, I want relevant company context (past deals, docs, prior meeting notes) surfaced the moment a related question comes up, so that I can answer accurately without breaking my flow.
- As a user, I want to quickly look up a fact or figure mid-meeting without leaving the call, so that I don't have to say "let me get back to you."
- As a user, I want a clean summary and action items the instant the meeting ends, so that I can act immediately instead of writing it up myself.
- As a user, I want to search across all my past meetings by topic, person, or keyword, so that nothing said months ago is ever really lost.
- As a user setting up the product, I want to connect my company's knowledge sources (docs, wiki, past meetings) once, so that the copilot has context from day one.
- *(Edge)* As a user, I want to see *why* the copilot surfaced a given fact (its source), so that I can trust and verify it before repeating it out loud.

## Requirements

### Must-Have (P0)
- **Live English transcription**, accurate enough to detect questions and topic shifts in real time.
  - *Acceptance:* Transcript keeps pace with live speech with no perceptible lag; speaker turns are captured.
- **Company knowledge ingestion**, connecting documents, wikis, and prior meeting transcripts into a retrievable knowledge base.
  - *Acceptance:* User can connect at least one source (e.g., document upload or wiki) and the copilot retrieves from it correctly in a test query.
- **Real-time contextual surfacing**, detecting a question or relevant topic in the live conversation and displaying grounded facts/talking points on screen within a few seconds.
  - *Acceptance:* Given a test question tied to ingested context, the correct fact is surfaced with its source, without the user prompting it manually.
- **Manual on-demand lookup**, letting the user actively ask the copilot something mid-meeting (typed or tapped) instead of waiting for auto-surfacing.
  - *Acceptance:* Query returns a grounded answer within a few seconds without the user leaving the meeting view.
- **Post-meeting summary + action items**, generated automatically when the meeting ends.
  - *Acceptance:* Available within seconds of meeting end; exportable/shareable.
- **Searchable meeting history**, across all past meetings by keyword, topic, or participant.
  - *Acceptance:* A query returns the correct meeting and moment, with a link/timestamp into that transcript.

### Nice-to-Have (P1)
- **Speaker diarization** (who said what) — sharpens both live surfacing and search.
- **Source citations inline** in the live suggestion (not just in a detail view).
- **Editable/annotatable transcript** post-meeting.
- **Highlight/bookmark** key moments live, for faster post-meeting review.
- **Confidence indicator** on surfaced facts (e.g., "from a doc updated 6 months ago" vs. "from last week's meeting").
- **Team-shared knowledge base** — one company's ingested context available to multiple teammates' meetings.

### Future Considerations (P2 / Phase 3+)
- **Code-switched, multilingual ASR** (English↔Hindi first) — the expansion into a new, currently underserved user base.
- **Tap-to-define** for unfamiliar terms/acronyms during the meeting.
- **Autonomous in-meeting agent** that starts tasks or drafts follow-ups live.
- **CRM/calendar write-back** and other system integrations.

## Success Metrics

**Leading (days–weeks):**
- % of meetings where the user engages a surfaced suggestion or manual lookup at least once.
- Time from question-asked to context-surfaced (target: a handful of seconds).
- % of ingested-context queries that return a correct, sourced answer (accuracy of retrieval).
- Time-to-summary after meeting end.

**Lagging (weeks–months):**
- Weekly retention / meetings-per-user-per-week.
- Self-reported answer confidence or quality (survey or in-app rating on suggestions).
- % of users who connect a second knowledge source after the first (signals ingestion is seen as worth the setup effort).

## Riskiest Assumption + Cheapest Test

**Assumption:** Real-time contextual surfacing is fast and accurate enough to actually get used mid-conversation — if it's too slow or too often wrong, users will tune it out within a meeting or two.
**Test:** Before building the full live pipeline, run a scripted mock meeting with 8–10 planted questions against a small ingested knowledge base (a handful of real docs). Measure retrieval accuracy and latency end-to-end. If latency or accuracy misses the mark here, fix retrieval and speed before investing in the live-detection layer.

## Open Questions

- **Meeting surface:** Desktop app, browser extension, or a bot that joins the call? (engineering/design) — *blocking for v1.*
- **Knowledge source priority:** Which source to support first — document upload, a specific wiki tool (e.g., Notion/Confluence), or past meeting transcripts only? (product) — *blocking, drives Phase 1 scope.*
- **Privacy/consent:** How is company data handled and secured, and what's the recording-consent flow for meeting participants? (legal) — *blocking before any external-facing launch.*
- **LLM backend:** Fixed provider or pluggable? (engineering)
- **Auto-surface vs. manual-only for v1:** Should Phase 1 ship both, or start manual-only (lower risk, simpler) and add auto-detection once retrieval is proven? (product) — *recommend deciding after the Phase 0 test above.*

## Phase-Wise Build Plan

**Phase 0 — Prove retrieval works (pre-build validation)**
- Scripted mock-meeting test above. No live pipeline yet.
- Output: go/no-go on retrieval accuracy and latency before writing the real-time layer.

**Phase 1 — Core copilot (v1, ship this first)**
- Live English transcription.
- Knowledge ingestion (start with one source type, per the open question above).
- Manual on-demand lookup mid-meeting (ship before auto-surfacing — lower risk, proves the retrieval loop with a human in control of timing).
- Post-meeting summary + action items.
- Searchable meeting history.

**Phase 1.5 — Auto-surfacing**
- Add real-time question/topic detection to trigger unprompted suggestions, once manual lookup has proven retrieval quality in the wild.

**Phase 2 — Depth (the nice-to-haves)**
- Speaker diarization.
- Inline source citations + confidence indicators.
- Editable transcript, live highlights/bookmarks.
- Team-shared knowledge base across a company's meetings.

**Phase 3 — New user base expansion**
- Code-switched, multilingual ASR (English↔Hindi first).
- Tap-to-define for unfamiliar terms.
- Considered, separately-validated bets: autonomous in-meeting agent, integrations/write-back.
