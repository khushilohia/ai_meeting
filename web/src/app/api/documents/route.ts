import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ingest } from "@/lib/retrieval";
import { requireUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const user = requireUser(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { title, content } = (await req.json().catch(() => ({}))) as { title?: string; content?: string };
  if (!title?.trim() || !content?.trim()) {
    return NextResponse.json({ error: "title and content are required" }, { status: 400 });
  }
  const { lastInsertRowid } = db
    .prepare("INSERT INTO documents (title, user_id) VALUES (?, ?)")
    .run(title.trim(), user.id);
  const documentId = Number(lastInsertRowid);
  const chunkCount = await ingest(content, { documentId });
  return NextResponse.json({ id: documentId, title, chunkCount }, { status: 201 });
}

export async function GET(req: NextRequest) {
  const user = requireUser(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const docs = db
    .prepare(
      `SELECT d.id, d.title, d.created_at, COUNT(c.id) AS chunk_count
       FROM documents d LEFT JOIN chunks c ON c.document_id = d.id
       WHERE d.user_id = ?
       GROUP BY d.id ORDER BY d.created_at DESC`
    )
    .all(user.id);
  return NextResponse.json(docs);
}
