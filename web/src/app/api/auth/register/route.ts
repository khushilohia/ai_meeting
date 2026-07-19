import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword, createSession, newApiToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { email, name, password } = (await req.json()) as { email?: string; name?: string; password?: string };
  if (!email?.trim() || !name?.trim() || !password || password.length < 8) {
    return NextResponse.json({ error: "email, name, and a password of 8+ characters are required" }, { status: 400 });
  }
  const normalized = email.trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(normalized)) {
    return NextResponse.json({ error: "invalid email" }, { status: 400 });
  }

  let userId: number;
  try {
    const info = db
      .prepare("INSERT INTO users (email, name, password_hash, api_token) VALUES (?, ?, ?, ?)")
      .run(normalized, name.trim(), hashPassword(password), newApiToken());
    userId = Number(info.lastInsertRowid);
  } catch {
    return NextResponse.json({ error: "an account with this email already exists" }, { status: 409 });
  }

  const { token, maxAge } = createSession(userId);
  const res = NextResponse.json({ ok: true }, { status: 201 });
  res.cookies.set("session", token, { httpOnly: true, sameSite: "lax", path: "/", maxAge, secure: process.env.NODE_ENV === "production" });
  return res;
}
