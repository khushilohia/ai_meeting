"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function MeetingActions({ id, title: initialTitle, tags: initialTags }: { id: number; title: string; tags: string[] }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(initialTitle);
  const [tags, setTags] = useState(initialTags.join(", "));
  const router = useRouter();

  async function save() {
    await fetch(`/api/meetings/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, tags: tags.split(",").map((t) => t.trim()).filter(Boolean) }),
    });
    setEditing(false);
    router.refresh();
  }

  async function remove() {
    if (!confirm("Delete this meeting, its transcript, and its knowledge chunks?")) return;
    await fetch(`/api/meetings/${id}`, { method: "DELETE" });
    router.push("/");
    router.refresh();
  }

  if (!editing) {
    return (
      <div className="flex items-center gap-3 text-xs">
        {initialTags.map((t) => (
          <a key={t} href={`/?tag=${encodeURIComponent(t)}`} className="rounded-full bg-zinc-200 px-2 py-0.5 text-zinc-700">
            {t}
          </a>
        ))}
        <button onClick={() => setEditing(true)} className="text-zinc-500 hover:underline">
          Rename / tag
        </button>
        <button onClick={remove} className="text-red-600 hover:underline">
          Delete
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="rounded border border-zinc-300 px-2 py-1 text-sm"
        placeholder="Title"
      />
      <input
        value={tags}
        onChange={(e) => setTags(e.target.value)}
        className="rounded border border-zinc-300 px-2 py-1 text-sm"
        placeholder="tags, comma, separated"
      />
      <button onClick={save} disabled={!title.trim()} className="rounded bg-zinc-900 px-3 py-1 text-sm text-white disabled:opacity-50">
        Save
      </button>
      <button onClick={() => setEditing(false)} className="text-sm text-zinc-500">
        Cancel
      </button>
    </div>
  );
}
