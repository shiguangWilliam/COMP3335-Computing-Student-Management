import { NextRequest, NextResponse } from "next/server";
import { relaySecure } from "@/lib/secureProxy";
import crypto from "crypto";
import { ensureSameSite } from "@/lib/cookieHeader";
import { envAuthDebug } from "@/lib/authDebug";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  return relaySecure(req, "/profile");
}

export async function GET(req: NextRequest) {
  const isDebug = envAuthDebug() && !process.env.NEXT_PUBLIC_API_URL;
  if (isDebug) {
    const cookieHeader = req.headers.get("cookie") || "";
    const m = cookieHeader.match(/(?:^|;\s*)auth=([^;]+)/);
    if (!m) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    try {
      const jsonStr = Buffer.from(m[1], "base64").toString("utf8");
      const user = JSON.parse(jsonStr);
      return NextResponse.json({ user }, { status: 200 });
    } catch {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }
  const base = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:3335";
  const url = `${base}/API/profile`;
  const secret = process.env.GATEWAY_SHARED_SECRET;
  if (!secret) {
    return NextResponse.json({ message: "Missing GATEWAY_SHARED_SECRET for gateway HMAC" }, { status: 500 });
  }
  const method = "GET";
  const timestamp = Date.now();
  const nonce = crypto.randomBytes(12).toString("hex");
  const canonical = [method, "/API/profile", "", String(timestamp), nonce].join("|");
  const signature = crypto.createHmac("sha256", secret).update(canonical, "utf8").digest("base64");
  const cookieHeader = req.headers.get("cookie") || undefined;
  const res = await fetch(url, {
    method: "GET",
    headers: {
      ...(cookieHeader ? { cookie: cookieHeader } : {}),
      "X-Gateway-Signature": signature,
      "X-Gateway-Signature-Alg": "HMAC-SHA256",
      "X-Gateway-Timestamp": String(timestamp),
      "X-Gateway-Nonce": nonce,
    },
    credentials: "include",
  });
  const ct = res.headers.get("content-type") || "";
  const isJson = ct.includes("application/json");
  const payload = isJson ? await res.json() : await res.text();
  const n = new NextResponse(isJson ? JSON.stringify(payload) : (payload as string), {
    status: res.status,
    headers: { "content-type": isJson ? "application/json" : "text/plain" },
  });
  const setCookie = res.headers.get("set-cookie");
  if (setCookie) n.headers.set("set-cookie", ensureSameSite(setCookie, "Lax"));
  return n;
}