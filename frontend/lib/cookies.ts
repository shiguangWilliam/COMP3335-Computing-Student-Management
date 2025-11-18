import { NextResponse } from "next/server";
import { COOKIE_NAME_AUTH, cookieOptionsAuth, AUTH_COOKIE_EXP_MS } from "./config";

type Role = "student" | "ARO" | "guardian" | "DRO";

export type AuthCookieInput = {
  email: string;
  role: Role;
  name?: string;
  exp?: number;
};

export function setAuthCookie(res: NextResponse, payload: AuthCookieInput) {
  const exp = payload.exp ?? Date.now() + AUTH_COOKIE_EXP_MS;
  const data = { email: payload.email, role: payload.role, name: payload.name, exp };
  res.cookies.set(COOKIE_NAME_AUTH, encodeURIComponent(JSON.stringify(data)), cookieOptionsAuth);
}

export function clearAuthCookie(res: NextResponse) {
 
  res.cookies.set(COOKIE_NAME_AUTH, "", { ...cookieOptionsAuth, maxAge: 0 });
}