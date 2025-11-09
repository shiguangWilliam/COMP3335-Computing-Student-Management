import { NextRequest, NextResponse } from "next/server";
import { COOKIE_NAME_AUTH } from "@/lib/config";

export async function GET(req: NextRequest) {
  const raw = req.cookies.get(COOKIE_NAME_AUTH)?.value;
  if (!raw) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const payload = JSON.parse(decodeURIComponent(raw));
    const { email, role, exp, name } = payload || {};
    if (!email || !role || !exp || Date.now() > exp) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ user: { email, role, name } });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}