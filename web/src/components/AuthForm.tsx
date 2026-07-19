"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AuthForm({ mode }: { mode: "login" | "register" }) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/auth/${mode}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(mode === "register" ? { email, name, password } : { email, password }),
    });
    setBusy(false);
    if (!res.ok) {
      setError((await res.json()).error ?? "Something went wrong");
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="mx-auto mt-12 max-w-sm space-y-3 rounded-lg border border-zinc-200 bg-white p-6">
      <h1 className="text-lg font-semibold">{mode === "login" ? "Sign in" : "Create your account"}</h1>
      {mode === "register" && (
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          required
          className="w-full rounded border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
        />
      )}
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        required
        className="w-full rounded border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder={mode === "register" ? "Password (8+ characters)" : "Password"}
        required
        minLength={mode === "register" ? 8 : undefined}
        className="w-full rounded border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button className="w-full rounded-lg bg-zinc-900 py-2 text-sm text-white disabled:opacity-50" disabled={busy}>
        {busy ? "…" : mode === "login" ? "Sign in" : "Create account"}
      </button>
      <p className="text-center text-xs text-zinc-500">
        {mode === "login" ? (
          <>
            No account? <a href="/register" className="underline">Register</a>
          </>
        ) : (
          <>
            Have an account? <a href="/login" className="underline">Sign in</a>
          </>
        )}
      </p>
    </form>
  );
}
