import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";

type SegmentIn = { speaker?: string; text: string; tsMs: number };

/** Batched transcript ingestion — the extension POSTs finalized segments every ~5s. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = requireUser(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const meeting = db.prepare("SELECT id, ended_at FROM meetings WHERE id = ? AND user_id = ?").get(id, user.id) as
    | { ended_at: string | null }
    | undefined;
  if (!meeting) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (meeting.ended_at) return NextResponse.json({ error: "meeting has ended" }, { status: 409 });

  const { segments } = (await req.json()) as { segments?: SegmentIn[] };
  if (!Array.isArray(segments) || segments.length === 0) {
    return NextResponse.json({ error: "segments array required" }, { status: 400 });
  }
  const insert = db.prepare("INSERT INTO segments (meeting_id, speaker, text, ts_ms) VALUES (?, ?, ?, ?)");
  const tx = db.transaction(() => {
    for (const s of segments) {
      if (!s.text?.trim() || typeof s.tsMs !== "number") continue;
      insert.run(id, s.speaker ?? null, s.text.trim(), s.tsMs);
    }
  });
  tx();
  return NextResponse.json({ ok: true, count: segments.length });
}
