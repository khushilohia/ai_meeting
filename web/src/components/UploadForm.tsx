"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function UploadForm() {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, content }),
    });
    setBusy(false);
    if (!res.ok) {
      setError((await res.json()).error ?? `Upload failed (${res.status})`);
      return;
    }
    setTitle("");
    setContent("");
    router.refresh();
  }

  async function onFile(f: File | undefined) {
    if (!f) return;
    setTitle((t) => t || f.name.replace(/\.(txt|md)$/i, ""));
    setContent(await f.text());
  }

  return (
    <form onSubmit={submit} className="space-y-2 rounded-lg border border-zinc-200 bg-white p-4">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Document title"
        className="w-full rounded border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
      />
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Paste document text (or choose a .txt/.md file below)…"
        rows={6}
        className="w-full rounded border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
      />
      <div className="flex items-center justify-between">
        <input type="file" accept=".txt,.md,text/plain,text/markdown" onChange={(e) => onFile(e.target.files?.[0])} className="text-xs" />
        <button className="rounded-lg bg-zinc-900 px-4 py-2 text-sm text-white disabled:opacity-50" disabled={busy || !title.trim() || !content.trim()}>
          {busy ? "Embedding…" : "Add to knowledge base"}
        </button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </form>
  );
}
