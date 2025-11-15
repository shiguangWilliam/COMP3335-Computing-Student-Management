import { NextRequest, NextResponse } from "next/server";
import { relaySecure } from "@/lib/secureProxy";
import crypto from "crypto";
import { ensureSameSite } from "@/lib/cookieHeader";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  return relaySecure(req, "/profile");
}

export async function GET(req: NextRequest) {
  // Plain JSON fallback: forward to backend GET /API/profile with HMAC
  const base = process.env.NEXT_PUBLIC_API_URL || req.nextUrl.origin;
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