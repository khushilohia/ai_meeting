import { NextRequest, NextResponse } from "next/server";
import { search } from "@/lib/retrieval";
import { requireUser } from "@/lib/auth";

/** Semantic search across all docs + past meetings. */
export async function GET(req: NextRequest) {
  const user = requireUser(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q) return NextResponse.json({ error: "q is required" }, { status: 400 });
  const results = await search(q, user.id, 10);
  return NextResponse.json(
    results.map((r) => ({
      source: r.source,
      snippet: r.content.slice(0, 300),
      score: r.score,
      documentId: r.documentId,
      meetingId: r.meetingId,
    }))
  );
}
