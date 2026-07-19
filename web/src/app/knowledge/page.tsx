import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import UploadForm from "@/components/UploadForm";
import DeleteDocButton from "@/components/DeleteDocButton";
import AskBox from "@/components/AskBox";

export const dynamic = "force-dynamic";

type DocRow = { id: number; title: string; created_at: string; chunk_count: number };

export default async function KnowledgePage() {
  const user = await currentUser();
  if (!user) redirect("/login");
  const docs = db
    .prepare(
      `SELECT d.id, d.title, d.created_at, COUNT(c.id) AS chunk_count
       FROM documents d LEFT JOIN chunks c ON c.document_id = d.id
       WHERE d.user_id = ?
       GROUP BY d.id ORDER BY d.created_at DESC`
    )
    .all(user.id) as DocRow[];

  return (
    <div className="space-y-8">
      <section>
        <h1 className="mb-3 text-lg font-semibold">Add company knowledge</h1>
        <UploadForm />
      </section>

      <section>
        <h2 className="mb-3 font-semibold">Documents ({docs.length})</h2>
        {docs.length === 0 ? (
          <p className="text-sm text-zinc-500">Nothing yet — the copilot can only answer from what you add here.</p>
        ) : (
          <ul className="divide-y divide-zinc-200 rounded-lg border border-zinc-200 bg-white">
            {docs.map((d) => (
              <li key={d.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <span className="text-sm font-medium">{d.title}</span>
                  <span className="ml-2 text-xs text-zinc-500">
                    {d.chunk_count} chunks · {d.created_at}
                  </span>
                </div>
                <DeleteDocButton id={d.id} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 font-semibold">Test a query</h2>
        <AskBox placeholder="Ask something your docs should answer…" />
      </section>
    </div>
  );
}
