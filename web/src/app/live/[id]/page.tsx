"use client";
import { use, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import AskBox from "@/components/AskBox";

type Segment = { id: number; speaker: string | null; text: string; ts_ms: number };
type Meeting = { title: string; ended_at: string | null; segments: Segment[] };
type Suggestion = { query: string; answer: string; sources: { source: string }[] };
type Definition = { term: string; definition: string; fromKnowledgeBase: boolean };

export default function LivePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [definition, setDefinition] = useState<Definition | null>(null);
  const [defineTerm, setDefineTerm] = useState("");
  const [defining, setDefining] = useState(false);
  const [ending, setEnding] = useState(false);
  const lastDetectedId = useRef(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // poll transcript
  useEffect(() => {
    let alive = true;
    async function poll() {
      const res = await fetch(`/api/meetings/${id}`);
      if (res.ok && alive) setMeeting(await res.json());
    }
    poll();
    const t = setInterval(poll, 3000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [id]);

  // auto-answers: every 10s, send segments we haven't analyzed yet to /api/detect
  useEffect(() => {
    const t = setInterval(async () => {
      const fresh = meeting?.segments.filter((s) => s.id > lastDetectedId.current) ?? [];
      if (fresh.length === 0 || meeting?.ended_at) return;
      lastDetectedId.current = fresh[fresh.length - 1].id;
      try {
        const res = await fetch("/api/detect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ recentTranscript: fresh.map((s) => s.text).join(" ") }),
        });
        if (!res.ok) return;
        const data = await res.json();
        if (data.suggestion) {
          setSuggestions((prev) => [{ query: data.query, ...data.suggestion }, ...prev].slice(0, 3));
        }
      } catch {
        /* best-effort */
      }
    }, 10_000);
    return () => clearInterval(t);
  }, [meeting, id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [meeting?.segments.length]);

  async function define(term: string) {
    if (!term.trim()) return;
    setDefining(true);
    setDefinition(null);
    try {
      const res = await fetch("/api/define", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ term }),
      });
      if (res.ok) setDefinition(await res.json());
    } finally {
      setDefining(false);
    }
  }

  // double-click any word in the transcript to define it
  function onTranscriptDoubleClick() {
    const sel = window.getSelection()?.toString().trim();
    if (sel && sel.length <= 100) define(sel);
  }

  async function endMeeting() {
    setEnding(true);
    await fetch(`/api/meetings/${id}/end`, { method: "POST" });
    router.push(`/meetings/${id}`);
  }

  if (!meeting) return <p className="text-sm text-zinc-500">Loading…</p>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">
          {meeting.title}{" "}
          {!meeting.ended_at && <span className="ml-2 text-sm font-normal text-emerald-600">● live</span>}
        </h1>
        {!meeting.ended_at && (
          <button onClick={endMeeting} disabled={ending} className="rounded-lg bg-red-700 px-4 py-2 text-sm text-white disabled:opacity-50">
            {ending ? "Summarizing…" : "End meeting"}
          </button>
        )}
      </div>

      <AskBox placeholder="Quick lookup — ask the knowledge base…" />

      <form
        onSubmit={(e) => {
          e.preventDefault();
          define(defineTerm);
        }}
        className="flex gap-2"
      >
        <input
          value={defineTerm}
          onChange={(e) => setDefineTerm(e.target.value)}
          placeholder="Define a term or acronym… (or double-click a word in the transcript)"
          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
        />
        <button className="rounded-lg bg-zinc-700 px-4 py-2 text-sm text-white disabled:opacity-50" disabled={defining}>
          {defining ? "…" : "Define"}
        </button>
      </form>

      {definition && (
        <div className="rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm">
          <b>{definition.term}</b> — {definition.definition}
          <span className="ml-2 text-xs text-zinc-500">{definition.fromKnowledgeBase ? "from your KB" : "general knowledge"}</span>
        </div>
      )}

      {suggestions.length > 0 && (
        <div className="space-y-2">
          {suggestions.map((s, i) => (
            <div key={i} className="rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-sm">
              <button
                onClick={() => setSuggestions((prev) => prev.filter((_, j) => j !== i))}
                className="float-right text-xs text-zinc-400"
              >
                ✕
              </button>
              <p className="text-xs font-medium text-emerald-800">💡 They may be asking: {s.query}</p>
              <p className="mt-1">{s.answer}</p>
              {s.sources?.map((src, j) => (
                <p key={j} className="mt-1 text-xs text-zinc-500">📄 {src.source}</p>
              ))}
            </div>
          ))}
        </div>
      )}

      <section
        onDoubleClick={onTranscriptDoubleClick}
        className="h-80 space-y-2 overflow-y-auto rounded-lg border border-zinc-200 bg-white p-4"
        title="Double-click a word to define it"
      >
        {meeting.segments.length === 0 ? (
          <p className="text-sm text-zinc-500">Waiting for transcript… (audio streams from the browser extension)</p>
        ) : (
          meeting.segments.map((s) => (
            <p key={s.id} className="text-sm">
              {s.speaker && <span className="mr-1 font-medium">{s.speaker}:</span>}
              {s.text}
            </p>
          ))
        )}
        <div ref={bottomRef} />
      </section>
    </div>
  );
}
