import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyPassword, createSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { email, password } = (await req.json()) as { email?: string; password?: string };
  if (!email || !password) return NextResponse.json({ error: "email and password required" }, { status: 400 });

  const user = db
    .prepare("SELECT id, password_hash FROM users WHERE email = ?")
    .get(email.trim().toLowerCase()) as { id: number; password_hash: string } | undefined;
  if (!user || !verifyPassword(password, user.password_hash)) {
    return NextResponse.json({ error: "invalid email or password" }, { status: 401 });
  }

  const { token, maxAge } = createSession(user.id);
  const res = NextResponse.json({ ok: true });
  res.cookies.set("session", token, { httpOnly: true, sameSite: "lax", path: "/", maxAge, secure: process.env.NODE_ENV === "production" });
  return res;
}
