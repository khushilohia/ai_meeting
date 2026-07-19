import Anthropic from "@anthropic-ai/sdk";
import type { RetrievedChunk } from "./retrieval";

const client = new Anthropic();
const MODEL = "claude-opus-4-8";

export type GroundedAnswer = {
  answer: string;
  sources: { index: number; source: string; snippet: string }[];
  confident: boolean;
};

/** Answer a query grounded ONLY in the retrieved chunks, with citations. */
export async function answer(query: string, chunks: RetrievedChunk[]): Promise<GroundedAnswer> {
  const context = chunks
    .map((c, i) => `[${i}] (${c.source})\n${c.content}`)
    .join("\n\n---\n\n");

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system:
      "You are a live meeting copilot. Answer the user's question using ONLY the provided context chunks. " +
      "Be brief — 1-3 sentences of facts the user can say out loud, not a script. " +
      "If the context does not contain the answer, set confident=false and say what is missing.",
    messages: [{ role: "user", content: `Context:\n${context}\n\nQuestion: ${query}` }],
    output_config: {
      format: {
        type: "json_schema",
        schema: {
          type: "object",
          properties: {
            answer: { type: "string" },
            sourceIndexes: { type: "array", items: { type: "integer" } },
            confident: { type: "boolean" },
          },
          required: ["answer", "sourceIndexes", "confident"],
          additionalProperties: false,
        },
      },
    },
  });

  const text = response.content.find((b) => b.type === "text");
  const parsed = JSON.parse(text?.type === "text" ? text.text : "{}") as {
    answer: string;
    sourceIndexes: number[];
    confident: boolean;
  };
  return {
    answer: parsed.answer,
    confident: parsed.confident,
    sources: (parsed.sourceIndexes ?? [])
      .filter((i) => chunks[i])
      .map((i) => ({ index: i, source: chunks[i].source, snippet: chunks[i].content.slice(0, 200) })),
  };
}

export type MeetingSummary = { summary: string; actionItems: string[] };

export async function summarize(transcript: string): Promise<MeetingSummary> {
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 2048,
    thinking: { type: "adaptive" },
    system:
      "You summarize meeting transcripts. Produce a concise summary (a few short paragraphs) and a list of concrete action items (owner if identifiable).",
    messages: [{ role: "user", content: `Transcript:\n${transcript.slice(0, 400_000)}` }],
    output_config: {
      format: {
        type: "json_schema",
        schema: {
          type: "object",
          properties: {
            summary: { type: "string" },
            actionItems: { type: "array", items: { type: "string" } },
          },
          required: ["summary", "actionItems"],
          additionalProperties: false,
        },
      },
    },
  });
  const text = response.content.find((b) => b.type === "text");
  const parsed = JSON.parse(text?.type === "text" ? text.text : "{}") as {
    summary: string;
    actionItems: string[];
  };
  return { summary: parsed.summary, actionItems: parsed.actionItems ?? [] };
}
