import { NextRequest, NextResponse } from "next/server";
import { ensureSameSite } from "@/lib/cookieHeader";
import crypto from "crypto";
import { decryptHybridJson, HybridEncryptedPayload } from "@/lib/cryptoServer";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const enc = (await req.json()) as HybridEncryptedPayload;
    const body = decryptHybridJson(enc);

    // 透传到后端现有登录接口（依赖后端监听 127.0.0.1:3335）
    const backendUrl = `http://127.0.0.1:3335/API/login`;
    // HMAC 网关签名
    const secret = process.env.GATEWAY_SHARED_SECRET;
    if (!secret) {
      return NextResponse.json({ message: "Missing GATEWAY_SHARED_SECRET for gateway HMAC" }, { status: 500 });
    }
    const method = "POST";
    const timestamp = Date.now();
    const nonce = crypto.randomBytes(12).toString("hex");
    const bodyStr = JSON.stringify(body);
    const canonical = [method, "/API/login", bodyStr, String(timestamp), nonce].join("|");
    const signature = crypto.createHmac("sha256", secret).update(canonical, "utf8").digest("base64");

    const res = await fetch(backendUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Gateway-Signature": signature,
        "X-Gateway-Signature-Alg": "HMAC-SHA256",
        "X-Gateway-Timestamp": String(timestamp),
        "X-Gateway-Nonce": nonce,
      },
      body: JSON.stringify(body),
      credentials: "include",
    });

    const ct = res.headers.get("content-type") || "";
    const data = ct.includes("application/json") ? await res.json() : await res.text();

    // 透传 Set-Cookie 给浏览器，以便登录态生效
    const n = new NextResponse(ct.includes("application/json") ? JSON.stringify(data) : (data as string), {
      status: res.status,
      headers: {
        "content-type": ct.includes("application/json") ? "application/json" : "text/plain",
      },
    });
    const setCookie = res.headers.get("set-cookie");
    if (setCookie) {
      n.headers.set("set-cookie", ensureSameSite(setCookie, "Lax"));
    }
    return n;
  } catch (err) {
    console.error("Secure login error:", err);
    return NextResponse.json({ 
      error: "Decryption failed or invalid request format",
      message: (err as Error).message,
      hint: "This endpoint requires encrypted payload. Use /API/login for testing with plain JSON."
    }, { status: 400 });
  }
}