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
    const base = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:3335";
    const url = `${base}/API/function${targetTail}${qs ? `?${qs}` : ""}`;

    const method = (dec.method || "POST").toUpperCase();
    const init: RequestInit = {
      method,
      headers: { "Content-Type": "application/json" },
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