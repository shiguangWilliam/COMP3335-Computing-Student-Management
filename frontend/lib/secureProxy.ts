import { NextRequest, NextResponse } from "next/server";
import { decryptHybridJson, HybridEncryptedPayload } from "@/lib/cryptoServer";

export type RelayPayload = {
  method?: string;
  body?: Record<string, unknown>;
  query?: Record<string, string>;
  timestamp?: number;
  nonce?: string;
};

export async function relaySecure(req: NextRequest, targetTail: string): Promise<NextResponse> {
  try {
    const enc = (await req.json()) as HybridEncryptedPayload;
    const dec = decryptHybridJson(enc) as RelayPayload;

    const qs = dec.query ? new URLSearchParams(dec.query).toString() : "";
    // 若未配置外部后端地址，则回落到当前站点 origin，使用内部 /API/function/* 路由
    const base = process.env.NEXT_PUBLIC_API_URL || req.nextUrl.origin;
    const url = `${base}/API/function${targetTail}${qs ? `?${qs}` : ""}`;

    const method = (dec.method || "POST").toUpperCase();
    const cookieHeader = req.headers.get("cookie") || undefined;
    const init: RequestInit = {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(cookieHeader ? { cookie: cookieHeader } : {}),
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

    const n = new NextResponse(isJson ? JSON.stringify(payload) : (payload as string), {
      status: res.status,
      headers: {
        "content-type": isJson ? "application/json" : "text/plain",
      },
    });
    const setCookie = res.headers.get("set-cookie");
    if (setCookie) n.headers.set("set-cookie", setCookie);
    return n;
  } catch (err) {
    return NextResponse.json({ message: (err as Error).message }, { status: 400 });
  }
}