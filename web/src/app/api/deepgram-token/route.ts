import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";

/** Mint a short-lived Deepgram access token so the extension can stream audio directly. */
export async function POST(req: NextRequest) {
  const user = requireUser(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const res = await fetch("https://api.deepgram.com/v1/auth/grant", {
    method: "POST",
    headers: { Authorization: `Token ${process.env.DEEPGRAM_API_KEY}` },
  });
  if (!res.ok) {
    return NextResponse.json({ error: `Deepgram ${res.status}` }, { status: 502 });
  }
  return NextResponse.json(await res.json()); // { access_token, expires_in }
}
