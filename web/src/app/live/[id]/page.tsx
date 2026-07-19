"use client";
import { use, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import AskBox from "@/components/AskBox";

type Segment = { id: number; speaker: string | null; text: string; ts_ms: number };
type Meeting = { title: string; ended_at: string | null; segments: Segment[] };

export default function LivePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [ending, setEnding] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

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

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [meeting?.segments.length]);

  async function endMeeting() {
    setEnding(true);
    await fetch(`/api/meetings/${id}/end`, { method: "POST" });
    router.push(`/meetings/${id}`);
  }

  if (!meeting) return <p className="text-sm text-zinc-500">Loading…</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">
          {meeting.title} <span className="ml-2 text-sm font-normal text-emerald-600">● live</span>
        </h1>
        {!meeting.ended_at && (
          <button onClick={endMeeting} disabled={ending} className="rounded-lg bg-red-700 px-4 py-2 text-sm text-white disabled:opacity-50">
            {ending ? "Summarizing…" : "End meeting"}
          </button>
        )}
      </div>

      <AskBox placeholder="Quick lookup — ask the knowledge base…" />

      <section className="h-96 space-y-2 overflow-y-auto rounded-lg border border-zinc-200 bg-white p-4">
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
