import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { search } from "@/lib/retrieval";
import { answer } from "@/lib/claude";
import { requireUser } from "@/lib/auth";

const client = new Anthropic();

/**
 * Auto-surfacing (Phase 3.5): given the last ~30s of transcript, decide whether
 * there's a question or info-need worth answering from the KB. If yes, answer it.
 */
export async function POST(req: NextRequest) {
  const user = requireUser(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { recentTranscript } = (await req.json()) as { recentTranscript?: string };
  if (!recentTranscript?.trim()) {
    return NextResponse.json({ error: "recentTranscript is required" }, { status: 400 });
  }

  const detection = await client.messages.create({
    model: "claude-opus-4-8",
    max_tokens: 200,
    output_config: {
      effort: "low",
      format: {
        type: "json_schema",
        schema: {
          type: "object",
          properties: { query: { type: ["string", "null"] } },
          required: ["query"],
          additionalProperties: false,
        },
      },
    },
    system:
      "You watch a live meeting transcript for a professional. If the latest snippet contains a factual question " +
      "or information need that a company knowledge base could answer (pricing, terms, past decisions, product facts), " +
      "return it as a short search query. Small talk, opinions, or logistics → query: null. Be conservative: only " +
      "surface when a lookup would clearly help.",
    messages: [{ role: "user", content: `Latest transcript snippet:\n${recentTranscript.slice(0, 4000)}` }],
  });

  const text = detection.content.find((b) => b.type === "text");
  const { query } = JSON.parse(text?.type === "text" ? text.text : "{}") as { query: string | null };
  if (!query) return NextResponse.json({ query: null, suggestion: null });

  const chunks = await search(query, user.id);
  if (chunks.length === 0) return NextResponse.json({ query, suggestion: null });
  const suggestion = await answer(query, chunks);
  // Don't surface low-confidence suggestions mid-meeting — they erode trust fast (PRD risk).
  if (!suggestion.confident) return NextResponse.json({ query, suggestion: null });
  return NextResponse.json({ query, suggestion });
}
