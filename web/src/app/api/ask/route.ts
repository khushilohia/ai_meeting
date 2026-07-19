import { NextRequest, NextResponse } from "next/server";
import { search } from "@/lib/retrieval";
import { answer } from "@/lib/claude";

/** The core loop: manual lookup and auto-surfacing both call this. */
export async function POST(req: NextRequest) {
  const { query } = (await req.json()) as { query?: string };
  if (!query?.trim()) return NextResponse.json({ error: "query is required" }, { status: 400 });

  const started = Date.now();
  const chunks = await search(query.trim());
  if (chunks.length === 0) {
    return NextResponse.json({
      answer: "No knowledge base content yet — upload documents first.",
      confident: false,
      sources: [],
      latencyMs: Date.now() - started,
    });
  }
  const result = await answer(query.trim(), chunks);
  return NextResponse.json({ ...result, latencyMs: Date.now() - started });
}
