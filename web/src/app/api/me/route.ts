import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser, newApiToken } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const user = requireUser(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json(user);
}

/** Rotate the API token (used by the extension). */
export async function POST(req: NextRequest) {
  const user = requireUser(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const token = newApiToken();
  db.prepare("UPDATE users SET api_token = ? WHERE id = ?").run(token, user.id);
  return NextResponse.json({ api_token: token });
}
