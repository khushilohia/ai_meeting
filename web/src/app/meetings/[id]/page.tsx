import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import TranscriptSegment from "@/components/TranscriptSegment";

export const dynamic = "force-dynamic";

type Meeting = { id: number; title: string; started_at: string; ended_at: string | null; summary: string | null; action_items: string | null };
type Segment = { id: number; speaker: string | null; text: string; ts_ms: number; bookmarked: number };

function fmt(ms: number) {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export default async function MeetingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const meeting = db.prepare("SELECT * FROM meetings WHERE id = ?").get(id) as Meeting | undefined;
  if (!meeting) notFound();
  const segments = db
    .prepare("SELECT id, speaker, text, ts_ms, bookmarked FROM segments WHERE meeting_id = ? ORDER BY ts_ms")
    .all(id) as Segment[];
  const actionItems: string[] = meeting.action_items ? JSON.parse(meeting.action_items) : [];

  return (
    <div className="space-y-8">
      <div>
        <Link href="/" className="text-sm text-zinc-500 hover:underline">
          ← Meetings
        </Link>
        <h1 className="mt-1 text-xl font-semibold">{meeting.title}</h1>
        <p className="text-sm text-zinc-500">
          {meeting.started_at} {meeting.ended_at ? `→ ${meeting.ended_at}` : "· live"}
        </p>
        {!meeting.ended_at && (
          <Link href={`/live/${meeting.id}`} className="mt-2 inline-block rounded bg-emerald-700 px-3 py-1.5 text-sm text-white">
            Open live view
          </Link>
        )}
      </div>

      {meeting.summary && (
        <section className="rounded-lg border border-zinc-200 bg-white p-4">
          <h2 className="mb-2 font-semibold">Summary</h2>
          <p className="whitespace-pre-wrap text-sm text-zinc-700">{meeting.summary}</p>
          {actionItems.length > 0 && (
            <>
              <h3 className="mb-1 mt-4 font-semibold">Action items</h3>
              <ul className="list-disc space-y-1 pl-5 text-sm text-zinc-700">
                {actionItems.map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ul>
            </>
          )}
        </section>
      )}

      <section>
        <h2 className="mb-2 font-semibold">
          Transcript <span className="text-xs font-normal text-zinc-400">(double-click a line to edit · hover for 🔖)</span>
        </h2>
        {segments.length === 0 ? (
          <p className="text-sm text-zinc-500">No transcript.</p>
        ) : (
          <div className="space-y-2 rounded-lg border border-zinc-200 bg-white p-4">
            {segments.map((s) => (
              <TranscriptSegment
                key={s.id}
                id={s.id}
                speaker={s.speaker}
                text={s.text}
                tsLabel={fmt(s.ts_ms)}
                bookmarked={s.bookmarked === 1}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
