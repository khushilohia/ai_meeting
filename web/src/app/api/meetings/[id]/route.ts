import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const meeting = db.prepare("SELECT * FROM meetings WHERE id = ?").get(id) as
    | { action_items: string | null }
    | undefined;
  if (!meeting) return NextResponse.json({ error: "not found" }, { status: 404 });
  const segments = db
    .prepare("SELECT id, speaker, text, ts_ms FROM segments WHERE meeting_id = ? ORDER BY ts_ms")
    .all(id);
  return NextResponse.json({
    ...meeting,
    action_items: meeting.action_items ? JSON.parse(meeting.action_items) : [],
    segments,
  });
}
