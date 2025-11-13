import { NextRequest, NextResponse } from "next/server";
import { decryptHybridJson, HybridEncryptedPayload } from "@/lib/cryptoServer";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const enc = (await req.json()) as HybridEncryptedPayload;
    const body = decryptHybridJson(enc);

    // 透传到后端现有登录接口（依赖后端监听 127.0.0.1:3335）
    const backendUrl = `http://127.0.0.1:3335/API/function/login`;
    const res = await fetch(backendUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
      n.headers.set("set-cookie", setCookie);
    }
    return n;
  } catch (err) {
    return NextResponse.json({ message: (err as Error).message }, { status: 400 });
  }
}