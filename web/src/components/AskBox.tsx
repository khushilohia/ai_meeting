"use client";
import { useState } from "react";

type Answer = {
  answer: string;
  confident: boolean;
  sources: { index: number; source: string; snippet: string }[];
  latencyMs: number;
};

export default function AskBox({ placeholder = "Ask the knowledge base…" }: { placeholder?: string }) {
  const [q, setQ] = useState("");
  const [result, setResult] = useState<Answer | null>(null);
  const [loading, setLoading] = useState(false);

  async function ask(e: React.FormEvent) {
    e.preventDefault();
    if (!q.trim()) return;
    setLoading(true);
    setResult(null);
    const res = await fetch("/api/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: q }),
    });
    setResult(res.ok ? await res.json() : null);
    setLoading(false);
  }

  return (
    <div>
      <form onSubmit={ask} className="flex gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
        />
        <button className="rounded-lg bg-emerald-700 px-4 py-2 text-sm text-white disabled:opacity-50" disabled={loading}>
          {loading ? "Thinking…" : "Ask"}
        </button>
      </form>
      {result && (
        <div className={`mt-4 rounded-lg border p-4 ${result.confident ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
          <p className="text-sm">{result.answer}</p>
          {result.sources.length > 0 && (
            <ul className="mt-3 space-y-1">
              {result.sources.map((s) => (
                <li key={s.index} className="text-xs text-zinc-500">
                  📄 {s.source} — “{s.snippet.slice(0, 80)}…”
                </li>
              ))}
            </ul>
          )}
          <p className="mt-2 text-xs text-zinc-400">{result.latencyMs}ms</p>
        </div>
      )}
    </div>
  );
}
