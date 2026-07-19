import { db, bufferToEmbedding, embeddingToBuffer } from "./db";
import { chunkText } from "./chunk";
import { embed, cosine } from "./embeddings";

export type RetrievedChunk = {
  chunkId: number;
  content: string;
  score: number;
  source: string; // human-readable, e.g. doc title or meeting title
  documentId: number | null;
  meetingId: number | null;
};

/** Chunk + embed + store content under a document or meeting. */
export async function ingest(
  content: string,
  owner: { documentId?: number; meetingId?: number }
): Promise<number> {
  const chunks = chunkText(content);
  const vectors = await embed(chunks, "document");
  const insert = db.prepare(
    "INSERT INTO chunks (document_id, meeting_id, seq, content, embedding) VALUES (?, ?, ?, ?, ?)"
  );
  const tx = db.transaction(() => {
    chunks.forEach((c, i) =>
      insert.run(owner.documentId ?? null, owner.meetingId ?? null, i, c, embeddingToBuffer(vectors[i]))
    );
  });
  tx();
  return chunks.length;
}

/** Top-k cosine search over the user's chunks. */
// ponytail: full scan over every embedding — fine to ~50k chunks; move to pgvector beyond that.
export async function search(query: string, userId: number, k = 6): Promise<RetrievedChunk[]> {
  const [qVec] = await embed([query], "query");
  const rows = db
    .prepare(
      `SELECT c.id, c.content, c.embedding, c.document_id, c.meeting_id,
              COALESCE(d.title, m.title, 'unknown') AS source
       FROM chunks c
       LEFT JOIN documents d ON d.id = c.document_id
       LEFT JOIN meetings m ON m.id = c.meeting_id
       WHERE d.user_id = ? OR m.user_id = ?`
    )
    .all(userId, userId) as { id: number; content: string; embedding: Buffer; document_id: number | null; meeting_id: number | null; source: string }[];

  return rows
    .map((r) => ({
      chunkId: r.id,
      content: r.content,
      score: cosine(qVec, bufferToEmbedding(r.embedding)),
      source: r.meeting_id ? `Meeting: ${r.source}` : r.source,
      documentId: r.document_id,
      meetingId: r.meeting_id,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
}
