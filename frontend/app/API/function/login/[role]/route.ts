import { NextResponse } from "next/server";
import { envAuthDebug, validateLocalLogin } from "@/lib/authDebug";
import { setAuthCookie } from "@/lib/cookies";

type LoginBody = { email: string; password: string };

export async function POST(req: Request, ctx: { params: Promise<{ role: string }> }) {
  const { email, password } = (await req.json()) as LoginBody;
  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
  }
  const params = await ctx.params;
  const roleParam = (params?.role || "student") as "student" | "ARO" | "guardian" | "DRO";
  const url = new URL(req.url);
  const debugOn = envAuthDebug() || ["1", "true"].includes(url.searchParams.get("debug") || "");

  let finalRole: "student" | "ARO" | "guardian" | "DRO" = roleParam;
  let name: string = email;
  if (debugOn) {
    const acc = await validateLocalLogin(email, password);
    if (!acc) {
      return NextResponse.json({ error: "Invalid local credentials" }, { status: 401 });
    }
    finalRole = acc.role; // trust local file role
    name = acc.name || email;
  }

  const res = NextResponse.json({ ok: true, user: { email, role: finalRole, name } });
  setAuthCookie(res, { email, role: finalRole, name });
  return res;
}