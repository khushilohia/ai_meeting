import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";

function ownedMeeting(id: string, userId: number) {
  return db.prepare("SELECT * FROM meetings WHERE id = ? AND user_id = ?").get(id, userId) as
    | { id: number; action_items: string | null; tags: string }
    | undefined;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = requireUser(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const meeting = ownedMeeting(id, user.id);
  if (!meeting) return NextResponse.json({ error: "not found" }, { status: 404 });
  const segments = db
    .prepare("SELECT id, speaker, text, ts_ms, bookmarked FROM segments WHERE meeting_id = ? ORDER BY ts_ms")
    .all(id);
  return NextResponse.json({
    ...meeting,
    action_items: meeting.action_items ? JSON.parse(meeting.action_items) : [],
    tags: JSON.parse(meeting.tags || "[]"),
    segments,
  });
}

/** Organize: rename and/or retag a meeting. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = requireUser(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  if (!ownedMeeting(id, user.id)) return NextResponse.json({ error: "not found" }, { status: 404 });

  const { title, tags } = (await req.json()) as { title?: string; tags?: string[] };
  if (title === undefined && tags === undefined) {
    return NextResponse.json({ error: "title or tags required" }, { status: 400 });
  }
  if (title !== undefined && !title.trim()) {
    return NextResponse.json({ error: "title cannot be empty" }, { status: 400 });
  }
  if (tags !== undefined && (!Array.isArray(tags) || tags.some((t) => typeof t !== "string"))) {
    return NextResponse.json({ error: "tags must be an array of strings" }, { status: 400 });
  }

  if (title !== undefined) db.prepare("UPDATE meetings SET title = ? WHERE id = ?").run(title.trim(), id);
  if (tags !== undefined) {
    const clean = [...new Set(tags.map((t) => t.trim()).filter(Boolean))];
    db.prepare("UPDATE meetings SET tags = ? WHERE id = ?").run(JSON.stringify(clean), id);
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = requireUser(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  if (!ownedMeeting(id, user.id)) return NextResponse.json({ error: "not found" }, { status: 404 });
  const tx = db.transaction(() => {
    db.prepare("DELETE FROM chunks WHERE meeting_id = ?").run(id);
    db.prepare("DELETE FROM segments WHERE meeting_id = ?").run(id);
    db.prepare("DELETE FROM meetings WHERE id = ?").run(id);
  });
  tx();
  return NextResponse.json({ ok: true });
}
