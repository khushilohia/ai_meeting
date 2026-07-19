import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = requireUser(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const info = db.prepare("DELETE FROM documents WHERE id = ? AND user_id = ?").run(id, user.id);
  if (info.changes === 0) return NextResponse.json({ error: "not found" }, { status: 404 });
  db.prepare("DELETE FROM chunks WHERE document_id = ?").run(id);
  return NextResponse.json({ ok: true });
}
