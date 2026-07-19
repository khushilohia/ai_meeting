import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const user = requireUser(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { title } = (await req.json().catch(() => ({}))) as { title?: string };
  const { lastInsertRowid } = db
    .prepare("INSERT INTO meetings (title, user_id) VALUES (?, ?)")
    .run(title?.trim() || `Meeting ${new Date().toLocaleString()}`, user.id);
  return NextResponse.json({ id: Number(lastInsertRowid) }, { status: 201 });
}

export async function GET(req: NextRequest) {
  const user = requireUser(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const meetings = db
    .prepare(
      "SELECT id, title, started_at, ended_at, tags, summary IS NOT NULL AS has_summary FROM meetings WHERE user_id = ? ORDER BY started_at DESC"
    )
    .all(user.id);
  return NextResponse.json(meetings);
}
