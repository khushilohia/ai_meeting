"use client";
import { useState } from "react";

type Result = { source: string; snippet: string; score: number; meetingId: number | null; documentId: number | null };

export default function SearchBar() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Result[] | null>(null);
  const [loading, setLoading] = useState(false);

  async function run(e: React.FormEvent) {
    e.preventDefault();
    if (!q.trim()) return;
    setLoading(true);
    const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
    setResults(res.ok ? await res.json() : []);
    setLoading(false);
  }

  return (
    <div>
      <form onSubmit={run} className="flex gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search across all meetings and docs…"
          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
        />
        <button className="rounded-lg bg-zinc-900 px-4 py-2 text-sm text-white disabled:opacity-50" disabled={loading}>
          {loading ? "…" : "Search"}
        </button>
      </form>
      {results && (
        <ul className="mt-4 space-y-3">
          {results.length === 0 && <li className="text-sm text-zinc-500">No results.</li>}
          {results.map((r, i) => (
            <li key={i} className="rounded-lg border border-zinc-200 bg-white p-3">
              <div className="text-xs font-medium text-zinc-500">
                {r.meetingId ? (
                  <a href={`/meetings/${r.meetingId}`} className="underline">
                    {r.source}
                  </a>
                ) : (
                  r.source
                )}
                <span className="ml-2 text-zinc-400">{(r.score * 100).toFixed(0)}% match</span>
              </div>
              <p className="mt-1 text-sm text-zinc-700">{r.snippet}…</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
