import { randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { db } from "./db";

export type User = { id: number; email: string; name: string; api_token: string };

const SESSION_DAYS = 30;

// ---------- passwords ----------
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const candidate = scryptSync(password, salt, 64);
  return timingSafeEqual(candidate, Buffer.from(hash, "hex"));
}

// ---------- sessions ----------
export function createSession(userId: number): { token: string; maxAge: number } {
  const token = randomBytes(32).toString("hex");
  db.prepare("INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, datetime('now', ?))").run(
    token,
    userId,
    `+${SESSION_DAYS} days`
  );
  return { token, maxAge: SESSION_DAYS * 86400 };
}

export function destroySession(token: string) {
  db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
}

function userBySession(token: string | undefined): User | null {
  if (!token) return null;
  return (
    (db
      .prepare(
        `SELECT u.id, u.email, u.name, u.api_token FROM sessions s
         JOIN users u ON u.id = s.user_id
         WHERE s.token = ? AND s.expires_at > datetime('now')`
      )
      .get(token) as User | undefined) ?? null
  );
}

function userByApiToken(token: string | undefined): User | null {
  if (!token) return null;
  return (
    (db.prepare("SELECT id, email, name, api_token FROM users WHERE api_token = ?").get(token) as
      | User
      | undefined) ?? null
  );
}

/** Auth for API routes: session cookie (website) or Bearer api_token (extension). */
export function requireUser(req: NextRequest): User | null {
  const bearer = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  return userByApiToken(bearer) ?? userBySession(req.cookies.get("session")?.value);
}

/** Auth for server components / pages. */
export async function currentUser(): Promise<User | null> {
  const jar = await cookies();
  return userBySession(jar.get("session")?.value);
}

export function newApiToken(): string {
  return "mc_" + randomBytes(24).toString("hex");
}
