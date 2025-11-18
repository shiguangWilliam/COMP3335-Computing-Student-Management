import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { decryptHybridJson, HybridEncryptedPayload } from "@/lib/cryptoServer";
import { ensureSameSite } from "@/lib/cookieHeader";

export type RelayPayload = {
  method?: string;
  body?: Record<string, unknown>;
  query?: Record<string, string>;
  timestamp?: number;
  nonce?: string;
  clientPublicKeyPem?: string;
};

export async function relaySecure(req: NextRequest, targetTail: string): Promise<NextResponse> {
  try {
    const enc = (await req.json()) as HybridEncryptedPayload;
    const dec = decryptHybridJson(enc) as RelayPayload;

    const qs = dec.query ? new URLSearchParams(dec.query).toString() : "";
    // 若未配置外部后端地址，则回落到当前站点 origin，使用单层 /API/* 路由
    const base = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:3335";
    const url = `${base}/API${targetTail}${qs ? `?${qs}` : ""}`;

    const method = (dec.method || "POST").toUpperCase();
    const cookieHeader = req.headers.get("cookie") || undefined;
    const secret = process.env.GATEWAY_SHARED_SECRET;
    if (!secret) {
      return NextResponse.json({ message: "Missing GATEWAY_SHARED_SECRET for gateway HMAC" }, { status: 500 });
    }
    const timestamp = dec.timestamp ?? Date.now();
    const nonce = dec.nonce ?? crypto.randomBytes(12).toString("hex");
    const bodyStr = method !== "GET" && dec.body ? JSON.stringify(dec.body) : "";
    const pathToSign = `/API${targetTail}${qs ? `?${qs}` : ""}`;
    const canonical = [method, pathToSign, bodyStr, String(timestamp), nonce].join("|");
    // Debug: 在服务端终端打印被签名字符串（任何 login 请求都会触发）
    const signature = crypto.createHmac("sha256", secret).update(canonical, "utf8").digest("base64");
    const init: RequestInit = {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(cookieHeader ? { cookie: cookieHeader } : {}),
        "X-Gateway-Signature": signature,
        "X-Gateway-Signature-Alg": "HMAC-SHA256",
        "X-Gateway-Timestamp": String(timestamp),
        "X-Gateway-Nonce": nonce,
      },
      credentials: "include",
    };
    if (method !== "GET" && dec.body) {
      init.body = JSON.stringify(dec.body);
    }

    const res = await fetch(url, init);
    const ct = res.headers.get("content-type") || "";
    const isJson = ct.includes("application/json");
    const payload = isJson ? await res.json() : await res.text();

    // 若客户端提供一次性公钥，则对 JSON 响应进行混合加密
    let responseBody: string;
    let responseContentType = isJson ? "application/json" : "text/plain";
    if (isJson && dec.clientPublicKeyPem) {
      const aesKey = crypto.randomBytes(32);
      const iv = crypto.randomBytes(12);
      const cipher = crypto.createCipheriv("aes-256-gcm", aesKey, iv);
      const plainStr = JSON.stringify(payload);
      const ciphertext = Buffer.concat([cipher.update(plainStr, "utf8"), cipher.final()]);
      const tag = cipher.getAuthTag();
      const encKey = crypto.publicEncrypt({
        key: dec.clientPublicKeyPem,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: "sha256",
      }, aesKey);
      const sig = crypto.createHmac("sha256", aesKey).update(plainStr, "utf8").digest();
      const envelope = {
        encryptedKeyBase64: encKey.toString("base64"),
        ivBase64: iv.toString("base64"),
        ciphertextBase64: ciphertext.toString("base64"),
        tagBase64: tag.toString("base64"),
        sigBase64: sig.toString("base64"),
      };
      responseBody = JSON.stringify(envelope);
      responseContentType = "application/json";
    } else {
      responseBody = isJson ? JSON.stringify(payload) : (payload as string);
    }

    const n = new NextResponse(responseBody, {
      status: res.status,
      headers: {
        "content-type": responseContentType,
      },
    });
    const setCookie = res.headers.get("set-cookie");
    if (setCookie) n.headers.set("set-cookie", ensureSameSite(setCookie, "Lax"));
    return n;
  } catch (err) {
    return NextResponse.json({ message: (err as Error).message }, { status: 400 });
  }
}