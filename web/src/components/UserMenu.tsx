"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function UserMenu({ name }: { name: string }) {
  const router = useRouter();
  return (
    <span className="ml-auto flex items-center gap-3 text-sm">
      <Link href="/profile" className="text-zinc-600 hover:text-zinc-900">
        {name}
      </Link>
      <button
        onClick={async () => {
          await fetch("/api/auth/logout", { method: "POST" });
          router.push("/login");
          router.refresh();
        }}
        className="text-xs text-zinc-500 hover:underline"
      >
        Sign out
      </button>
    </span>
  );
}
