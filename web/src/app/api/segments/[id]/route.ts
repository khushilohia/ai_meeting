import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/** Edit a transcript segment's text and/or toggle its bookmark (Phase 4). */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { text, bookmarked } = (await req.json()) as { text?: string; bookmarked?: boolean };
  if (text === undefined && bookmarked === undefined) {
    return NextResponse.json({ error: "text or bookmarked required" }, { status: 400 });
  }
  if (text !== undefined && !text.trim()) {
    return NextResponse.json({ error: "text cannot be empty" }, { status: 400 });
  }

  const sets: string[] = [];
  const args: (string | number)[] = [];
  if (text !== undefined) sets.push("text = ?"), args.push(text.trim());
  if (bookmarked !== undefined) sets.push("bookmarked = ?"), args.push(bookmarked ? 1 : 0);
  const info = db.prepare(`UPDATE segments SET ${sets.join(", ")} WHERE id = ?`).run(...args, id);
  if (info.changes === 0) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
