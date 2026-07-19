"use client";
import { useState } from "react";

export default function ApiTokenCard({ token: initial }: { token: string }) {
  const [token, setToken] = useState(initial);
  const [copied, setCopied] = useState(false);

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4">
      <h2 className="font-semibold">Extension API token</h2>
      <p className="mt-1 text-sm text-zinc-600">
        Paste this into the Meeting Copilot extension settings so it can talk to your account.
      </p>
      <div className="mt-3 flex items-center gap-2">
        <code className="flex-1 overflow-x-auto rounded bg-zinc-100 px-2 py-1.5 text-xs">{token}</code>
        <button
          onClick={async () => {
            await navigator.clipboard.writeText(token);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          className="rounded bg-zinc-900 px-3 py-1.5 text-xs text-white"
        >
          {copied ? "Copied ✓" : "Copy"}
        </button>
        <button
          onClick={async () => {
            if (!confirm("Rotate token? The extension will need the new one.")) return;
            const res = await fetch("/api/me", { method: "POST" });
            if (res.ok) setToken((await res.json()).api_token);
          }}
          className="rounded border border-zinc-300 px-3 py-1.5 text-xs"
        >
          Rotate
        </button>
      </div>
    </div>
  );
}
