import { NextRequest, NextResponse } from "next/server";
import { relaySecure } from "@/lib/secureProxy";
import { envAuthDebug } from "@/lib/authDebug";

export const dynamic = "force-dynamic";

function isLocalHost(host: string | null): boolean {
  const h = (host || "").toLowerCase();
  return h === "localhost" || h === "127.0.0.1";
}

async function ensureDBA(req: NextRequest): Promise<boolean> {
  const isDebug = envAuthDebug() && !process.env.NEXT_PUBLIC_API_URL;
  if (!isLocalHost(req.nextUrl.hostname)) return false;
  if (isDebug) {
    const cookieHeader = req.headers.get("cookie") || "";
    const m = cookieHeader.match(/(?:^|;\s*)auth=([^;]+)/);
    if (!m) return false;
    try {
      const jsonStr = Buffer.from(m[1], "base64").toString("utf8");
      const user = JSON.parse(jsonStr) as { role?: string };
      return user.role === "DBA";
    } catch { return false; }
  }
  return true;
}

export async function POST(req: NextRequest) {
  const ok = await ensureDBA(req);
  if (!ok) return NextResponse.json({ message: "forbidden" }, { status: 403 });
  return relaySecure(req, "/students");
}