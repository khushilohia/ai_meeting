import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { search } from "@/lib/retrieval";
import { requireUser } from "@/lib/auth";

const client = new Anthropic();

/** Quick mid-meeting definition of a term/acronym — KB-aware, falls back to general knowledge. */
export async function POST(req: NextRequest) {
  const user = requireUser(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { term } = (await req.json().catch(() => ({}))) as { term?: string };
  if (!term?.trim() || term.length > 100) {
    return NextResponse.json({ error: "term is required (max 100 chars)" }, { status: 400 });
  }

  const started = Date.now();
  const chunks = await search(term.trim(), user.id, 3);
  const context = chunks
    .filter((c) => c.score > 0.4)
    .map((c) => `(${c.source})\n${c.content}`)
    .join("\n\n");

  const response = await client.messages.create({
    model: "claude-opus-4-8",
    max_tokens: 300,
    output_config: { effort: "low" },
    system:
      "You define terms for someone in a live meeting. One or two sentences, plain language. " +
      "If company context is provided and relevant, prefer it and mention the source; otherwise define from general knowledge.",
    messages: [
      {
        role: "user",
        content: context ? `Company context:\n${context}\n\nDefine: ${term.trim()}` : `Define: ${term.trim()}`,
      },
    ],
  });
  const text = response.content.find((b) => b.type === "text");
  return NextResponse.json({
    term: term.trim(),
    definition: text?.type === "text" ? text.text : "",
    fromKnowledgeBase: Boolean(context),
    latencyMs: Date.now() - started,
  });
}
