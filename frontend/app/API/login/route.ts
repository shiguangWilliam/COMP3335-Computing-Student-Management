import { NextRequest, NextResponse } from "next/server";
import { relaySecure } from "@/lib/secureProxy";
import crypto from "crypto";
import { ensureSameSite } from "@/lib/cookieHeader";
import { envAuthDebug, validateLocalLogin } from "@/lib/authDebug";
import { decryptHybridJson, HybridEncryptedPayload } from "@/lib/cryptoServer";
import { cookieOptionsAuth } from "@/lib/config";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    // 使用 clone() 读取请求体以进行格式判定，避免消耗原始流
    const body = await req.clone().json();
    const isEnvelope = !!(
      body && typeof body === "object" &&
      typeof (body as Record<string, unknown>)["encryptedKeyBase64"] === "string" &&
      typeof (body as Record<string, unknown>)["ivBase64"] === "string" &&
      typeof (body as Record<string, unknown>)["ciphertextBase64"] === "string" &&
      typeof (body as Record<string, unknown>)["tagBase64"] === "string"
    );
    const isDebug = envAuthDebug() && !process.env.NEXT_PUBLIC_API_URL;
    if (isDebug) {
      if (isEnvelope) {
        const dec = decryptHybridJson(body as HybridEncryptedPayload) as Record<string, unknown>;
        const decBody = (dec["body"] as Record<string, unknown> | undefined) || undefined;
        const email = (dec["email"] as string | undefined) ?? (decBody?.["email"] as string | undefined);
        const password = (dec["password"] as string | undefined) ?? (decBody?.["password"] as string | undefined);
        if (!email || !password) {
          return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
        }
        const acc = await validateLocalLogin(email, password);
        if (!acc) {
          return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
        }
        const payload = { email: acc.email, role: acc.role, name: acc.name || acc.email };
        const cookieVal = Buffer.from(JSON.stringify(payload)).toString("base64");
        const secure = cookieOptionsAuth.secure ? "; Secure" : "";
        const domain = cookieOptionsAuth.domain ? `; Domain=${cookieOptionsAuth.domain}` : "";
        const setCookie = `auth=${cookieVal}; Path=${cookieOptionsAuth.path}; HttpOnly; SameSite=${cookieOptionsAuth.sameSite}; Max-Age=${cookieOptionsAuth.maxAge}${secure}${domain}`;
        const n = new NextResponse(JSON.stringify({ user: payload }), { status: 200, headers: { "content-type": "application/json" } });
        n.headers.set("set-cookie", setCookie);
        return n;
      } else {
        const { email, password } = body as { email: string; password: string };
        if (!email || !password) {
          return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
        }
        const acc = await validateLocalLogin(email, password);
        if (!acc) {
          return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
        }
        const payload = { email: acc.email, role: acc.role, name: acc.name || acc.email };
        const cookieVal = Buffer.from(JSON.stringify(payload)).toString("base64");
        const secure = cookieOptionsAuth.secure ? "; Secure" : "";
        const domain = cookieOptionsAuth.domain ? `; Domain=${cookieOptionsAuth.domain}` : "";
        const setCookie = `auth=${cookieVal}; Path=${cookieOptionsAuth.path}; HttpOnly; SameSite=${cookieOptionsAuth.sameSite}; Max-Age=${cookieOptionsAuth.maxAge}${secure}${domain}`;
        const n = new NextResponse(JSON.stringify({ user: payload }), { status: 200, headers: { "content-type": "application/json" } });
        n.headers.set("set-cookie", setCookie);
        return n;
      }
    }
    if (isEnvelope) {
      return relaySecure(req, "/login");
    }

    // Plain JSON fallback: forward to backend /API/login with HMAC
    const { email, password, role } = body as { email: string; password: string; role?: "student" | "ARO" | "guardian" | "DRO" };
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }
    const base = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:3335";
    const url = `${base}/API/login`;
    const secret = process.env.GATEWAY_SHARED_SECRET;
    if (!secret) {
      return NextResponse.json({ message: "Missing GATEWAY_SHARED_SECRET for gateway HMAC" }, { status: 500 });
    }
    const method = "POST";
    const timestamp = Date.now();
    const nonce = crypto.randomBytes(12).toString("hex");
    const bodyStr = JSON.stringify({ email, password, role });
    const canonical = [method, "/API/login", bodyStr, String(timestamp), nonce].join("|");
    
    
    const signature = crypto.createHmac("sha256", secret).update(canonical, "utf8").digest("base64");

    const cookieHeader = req.headers.get("cookie") || undefined;
    // Debug: 输出当前请求携带的 Cookie 头（服务端终端可见）
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(cookieHeader ? { cookie: cookieHeader } : {}),
        "X-Gateway-Signature": signature,
        "X-Gateway-Signature-Alg": "HMAC-SHA256",
        "X-Gateway-Timestamp": String(timestamp),
        "X-Gateway-Nonce": nonce,
      },
      body: bodyStr,
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
  } catch (err) {
    return NextResponse.json({ message: (err as Error).message }, { status: 400 });
  }
}