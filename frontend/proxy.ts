import { NextRequest, NextResponse } from "next/server";
import { COOKIE_NAME_AUTH } from "@/lib/config";

function base64UrlDecode(input: string): string {
  const pad = input.length % 4 === 0 ? "" : "=".repeat(4 - (input.length % 4));
  const b64 = input.replace(/-/g, "+").replace(/_/g, "/") + pad;
  return Buffer.from(b64, "base64").toString("utf8");
}

function getUser(req: NextRequest): { role: string; email: string } | null {
  const raw = req.cookies.get(COOKIE_NAME_AUTH)?.value;
  if (!raw) return null;
  // 支持两种格式：旧版 JSON Cookie 与 JWT（三段式）
  // JWT 校验由后端负责；此处仅用于 UI 导航与基本角色判定
  if (raw.includes(".")) {
    const parts = raw.split(".");
    if (parts.length !== 3) return null;
    try {
      const payloadStr = base64UrlDecode(parts[1]);
      const payload = JSON.parse(payloadStr) as { role?: string; email?: string; exp?: number };
      // exp 通常为秒；做兼容处理
      const expMs = payload.exp ? (payload.exp > 1e12 ? payload.exp : payload.exp * 1000) : undefined;
      if (!payload.role || !payload.email || (expMs && Date.now() > expMs)) return null;
      return { role: payload.role, email: payload.email };
    } catch {
      return null;
    }
  }
  // 兼容旧版 JSON Cookie（迁移期）
  try {
    const payload = JSON.parse(decodeURIComponent(raw));
    if (!payload || !payload.role || !payload.email || !payload.exp || Date.now() > payload.exp) return null;
    return { role: payload.role, email: payload.email };
  } catch {
    return null;
  }
}

function isPublic(path: string) {
  if (path.startsWith("/_next") || path.startsWith("/public") || path.startsWith("/favicon.ico")) return true;
  if (path.startsWith("/API/")) return true; // allow API routes
  return ["/", "/login", "/register"].includes(path);
}

function allowedRoles(path: string): string[] | null {
  // Define simple role-based restrictions; adjust as needed
  if (path.startsWith("/admin")) return ["ARO", "DRO"]; // staff-only
  // Grades: student & guardian can access their grades; ARO manages grades
  if (path.startsWith("/grades")) return ["student", "guardian", "ARO"];
  // Disciplinary records: DRO manages; include both possible paths for future pages
  if (path.startsWith("/disciplinary") || path.startsWith("/disciplinaries")) return ["DRO"];
  // Other academic management sections remain staff-only
  if (path.startsWith("/enrollments")) return ["ARO", "DRO"];
  if (path.startsWith("/courses")) return ["ARO", "DRO"];
  // Reports: allow all roles to access relevant reports
  if (path.startsWith("/reports")) return ["student", "guardian", "ARO", "DRO"];
  if (path.startsWith("/students")) return ["ARO", "DRO"]; // limit student management to staff roles
  // Profile: all roles can maintain personal information
  if (path.startsWith("/profile")) return ["student", "ARO", "guardian", "DRO"]; // any logged-in user
  return null; // no special restriction (public or default)
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (isPublic(pathname)) return NextResponse.next();

  const user = getUser(req);
  if (!user) {
    const url = new URL("/login", req.url);
    return NextResponse.redirect(url);
  }

  const roles = allowedRoles(pathname);
  if (roles && !roles.includes(user.role)) {
    // redirect unauthorized users to home
    const url = new URL("/", req.url);
    return NextResponse.redirect(url);
  }

  // Prevent logged-in users from visiting login/register
  if (pathname === "/login" || pathname === "/register") {
    const url = new URL("/", req.url);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|API|api).*)",
  ],
};