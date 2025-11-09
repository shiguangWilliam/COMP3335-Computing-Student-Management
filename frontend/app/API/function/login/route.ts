import { NextResponse } from "next/server";
import { envAuthDebug, validateLocalLogin } from "@/lib/authDebug";
import { setAuthCookie } from "@/lib/cookies";

type LoginBody = { email: string; password: string };

export async function POST(req: Request) {
  const { email, password } = (await req.json()) as LoginBody;
  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
  }
  const url = new URL(req.url);
  const debugOn = envAuthDebug() || ["1", "true"].includes(url.searchParams.get("debug") || "");

  let role: "student" | "ARO" | "guardian" | "DRO";
  let name: string;
  if (debugOn) {
    const acc = await validateLocalLogin(email, password);
    if (!acc) {
      return NextResponse.json({ error: "Invalid local credentials" }, { status: 401 });
    }
    role = acc.role;
    name = acc.name || email;
  } else {
    // Demo-only: assign a role by simple email pattern; replace with real auth later
    role = email.toLowerCase().includes("aro")
      ? "ARO"
      : email.toLowerCase().includes("dro")
      ? "DRO"
      : email.toLowerCase().includes("guardian")
      ? "guardian"
      : "student";
    name = email;
  }

  const res = NextResponse.json({ ok: true, user: { email, role, name } });
  setAuthCookie(res, { email, role, name });
  return res;
}