"use client";
import { useRouter } from "next/navigation";

export default function DeleteDocButton({ id }: { id: number }) {
  const router = useRouter();
  return (
    <button
      onClick={async () => {
        if (!confirm("Delete this document and its chunks?")) return;
        await fetch(`/api/documents/${id}`, { method: "DELETE" });
        router.refresh();
      }}
      className="text-xs text-red-600 hover:underline"
    >
      Delete
    </button>
  );
}
