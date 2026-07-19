"use client";
import { useState } from "react";

type Props = { id: number; speaker: string | null; text: string; tsLabel: string; bookmarked: boolean };

export default function TranscriptSegment({ id, speaker, text: initial, tsLabel, bookmarked: initialBookmark }: Props) {
  const [text, setText] = useState(initial);
  const [bookmarked, setBookmarked] = useState(initialBookmark);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(initial);

  async function patch(body: { text?: string; bookmarked?: boolean }) {
    await fetch(`/api/segments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  return (
    <div className={`group flex items-start gap-2 rounded px-1 ${bookmarked ? "bg-amber-50" : ""}`}>
      <span className="mt-0.5 font-mono text-xs text-zinc-400">{tsLabel}</span>
      <div className="flex-1 text-sm">
        {speaker && <span className="mr-1 font-medium">{speaker}:</span>}
        {editing ? (
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={async (e) => {
              if (e.key === "Enter" && draft.trim()) {
                await patch({ text: draft });
                setText(draft.trim());
                setEditing(false);
              }
              if (e.key === "Escape") setEditing(false);
            }}
            className="w-full rounded border border-zinc-300 px-1 text-sm"
          />
        ) : (
          <span onDoubleClick={() => (setDraft(text), setEditing(true))}>{text}</span>
        )}
      </div>
      <button
        title={bookmarked ? "Remove bookmark" : "Bookmark this moment"}
        onClick={async () => {
          await patch({ bookmarked: !bookmarked });
          setBookmarked(!bookmarked);
        }}
        className={`text-xs ${bookmarked ? "" : "opacity-0 group-hover:opacity-60"}`}
      >
        🔖
      </button>
    </div>
  );
}
