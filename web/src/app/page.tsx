import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import SearchBar from "@/components/SearchBar";

export const dynamic = "force-dynamic";

type MeetingRow = { id: number; title: string; started_at: string; ended_at: string | null; has_summary: number; tags: string };

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ tag?: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/login");
  const { tag } = await searchParams;
  const all = db
    .prepare(
      "SELECT id, title, started_at, ended_at, tags, summary IS NOT NULL AS has_summary FROM meetings WHERE user_id = ? ORDER BY started_at DESC LIMIT 200"
    )
    .all(user.id) as MeetingRow[];
  const withTags = all.map((m) => ({ ...m, tagList: JSON.parse(m.tags || "[]") as string[] }));
  const allTags = [...new Set(withTags.flatMap((m) => m.tagList))].sort();
  const meetings = tag ? withTags.filter((m) => m.tagList.includes(tag)) : withTags;

  return (
    <div className="space-y-8">
      <SearchBar />
      <section>
        <div className="mb-3 flex items-center gap-3">
          <h2 className="text-lg font-semibold">Meetings</h2>
          {allTags.length > 0 && (
            <span className="flex flex-wrap gap-1.5 text-xs">
              <Link href="/" className={`rounded-full px-2 py-0.5 ${!tag ? "bg-zinc-900 text-white" : "bg-zinc-200 text-zinc-700"}`}>
                all
              </Link>
              {allTags.map((t) => (
                <Link
                  key={t}
                  href={`/?tag=${encodeURIComponent(t)}`}
                  className={`rounded-full px-2 py-0.5 ${tag === t ? "bg-zinc-900 text-white" : "bg-zinc-200 text-zinc-700"}`}
                >
                  {t}
                </Link>
              ))}
            </span>
          )}
        </div>
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
                  <span className="text-sm font-medium">
                    {m.title}
                    {m.tagList.map((t) => (
                      <span key={t} className="ml-2 rounded-full bg-zinc-200 px-2 py-0.5 text-xs font-normal text-zinc-600">
                        {t}
                      </span>
                    ))}
                  </span>
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
