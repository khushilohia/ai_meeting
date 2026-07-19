import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  const { title } = (await req.json().catch(() => ({}))) as { title?: string };
  const { lastInsertRowid } = db
    .prepare("INSERT INTO meetings (title) VALUES (?)")
    .run(title?.trim() || `Meeting ${new Date().toLocaleString()}`);
  return NextResponse.json({ id: Number(lastInsertRowid) }, { status: 201 });
}

export async function GET() {
  const meetings = db
    .prepare("SELECT id, title, started_at, ended_at, summary IS NOT NULL AS has_summary FROM meetings ORDER BY started_at DESC")
    .all();
  return NextResponse.json(meetings);
}
