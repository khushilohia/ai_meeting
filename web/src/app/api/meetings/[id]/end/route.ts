import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { summarize } from "@/lib/claude";
import { ingest } from "@/lib/retrieval";

/** End a meeting: generate summary + action items, embed transcript into the KB. */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const meeting = db.prepare("SELECT id, ended_at FROM meetings WHERE id = ?").get(id) as
    | { ended_at: string | null }
    | undefined;
  if (!meeting) return NextResponse.json({ error: "not found" }, { status: 404 });

  const segments = db
    .prepare("SELECT speaker, text FROM segments WHERE meeting_id = ? ORDER BY ts_ms")
    .all(id) as { speaker: string | null; text: string }[];
  if (segments.length === 0) {
    db.prepare("UPDATE meetings SET ended_at = datetime('now') WHERE id = ?").run(id);
    return NextResponse.json({ summary: null, actionItems: [], note: "no transcript" });
  }

  const transcript = segments.map((s) => (s.speaker ? `${s.speaker}: ${s.text}` : s.text)).join("\n");
  const { summary, actionItems } = await summarize(transcript);

  db.prepare("UPDATE meetings SET ended_at = datetime('now'), summary = ?, action_items = ? WHERE id = ?").run(
    summary,
    JSON.stringify(actionItems),
    id
  );
  // Make this meeting retrievable in future meetings (idempotence: clear old chunks first)
  db.prepare("DELETE FROM chunks WHERE meeting_id = ?").run(id);
  await ingest(transcript, { meetingId: Number(id) });

  return NextResponse.json({ summary, actionItems });
}
