import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import SearchBar from "@/components/SearchBar";

export const dynamic = "force-dynamic";

type MeetingRow = { id: number; title: string; started_at: string; ended_at: string | null; has_summary: number };

export default async function Dashboard() {
  const user = await currentUser();
  if (!user) redirect("/login");
  const meetings = db
    .prepare(
      "SELECT id, title, started_at, ended_at, summary IS NOT NULL AS has_summary FROM meetings WHERE user_id = ? ORDER BY started_at DESC LIMIT 50"
    )
    .all(user.id) as MeetingRow[];

  return (
    <div className="space-y-8">
      <SearchBar />
      <section>
        <h2 className="mb-3 text-lg font-semibold">Meetings</h2>
        {meetings.length === 0 ? (
          <p className="text-sm text-zinc-500">
            No meetings yet. Start one from the browser extension during a call, or add company docs on the{" "}
            <Link href="/knowledge" className="underline">
              Knowledge
            </Link>{" "}
            page.
          </p>
        ) : (
          <ul className="divide-y divide-zinc-200 rounded-lg border border-zinc-200 bg-white">
            {meetings.map((m) => (
              <li key={m.id}>
                <Link href={`/meetings/${m.id}`} className="flex items-center justify-between px-4 py-3 hover:bg-zinc-50">
                  <span className="text-sm font-medium">{m.title}</span>
                  <span className="text-xs text-zinc-500">
                    {m.started_at}
                    {m.ended_at ? (m.has_summary ? " · summarized" : " · ended") : " · live"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
