import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import ApiTokenCard from "@/components/ApiTokenCard";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await currentUser();
  if (!user) redirect("/login");

  const stats = db
    .prepare(
      `SELECT
        (SELECT COUNT(*) FROM meetings WHERE user_id = ?) AS meetings,
        (SELECT COUNT(*) FROM documents WHERE user_id = ?) AS documents`
    )
    .get(user.id, user.id) as { meetings: number; documents: number };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">{user.name}</h1>
        <p className="text-sm text-zinc-500">{user.email}</p>
        <p className="mt-1 text-sm text-zinc-500">
          {stats.meetings} meetings · {stats.documents} knowledge docs
        </p>
      </div>
      <ApiTokenCard token={user.api_token} />
    </div>
  );
}
