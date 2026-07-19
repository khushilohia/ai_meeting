import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ingest } from "@/lib/retrieval";

export async function POST(req: NextRequest) {
  const { title, content } = (await req.json()) as { title?: string; content?: string };
  if (!title?.trim() || !content?.trim()) {
    return NextResponse.json({ error: "title and content are required" }, { status: 400 });
  }
  const { lastInsertRowid } = db.prepare("INSERT INTO documents (title) VALUES (?)").run(title.trim());
  const documentId = Number(lastInsertRowid);
  const chunkCount = await ingest(content, { documentId });
  return NextResponse.json({ id: documentId, title, chunkCount }, { status: 201 });
}

export async function GET() {
  const docs = db
    .prepare(
      `SELECT d.id, d.title, d.created_at, COUNT(c.id) AS chunk_count
       FROM documents d LEFT JOIN chunks c ON c.document_id = d.id
       GROUP BY d.id ORDER BY d.created_at DESC`
    )
    .all();
  return NextResponse.json(docs);
}
