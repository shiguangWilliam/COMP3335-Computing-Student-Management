import { NextRequest, NextResponse } from "next/server";

async function getUser(req: NextRequest): Promise<{ role: string; email: string } | null> {
  try {
    const url = new URL("/API/profile", req.url);
    const cookieHeader = req.headers.get("cookie") || "";
    const res = await fetch(url.toString(), {
      method: "GET",
      headers: cookieHeader ? { cookie: cookieHeader } : {},
    });
    if (!res.ok) return null;
    const data = await res.json();
    const role = (data?.role ?? data?.user?.role) as string | undefined;
    const email = (data?.email ?? data?.user?.email) as string | undefined;
    if (!role || !email) return null;
    return { role, email };
  } catch {
    return null;
  }
}

function isPublic(path: string) {
  if (path.startsWith("/_next") || path.startsWith("/public") || path.startsWith("/favicon.ico")) return true;
  if (path.startsWith("/API/")) return true; 
  return ["/", "/login", "/register"].includes(path);
}

function allowedRoles(path: string): string[] | null {
  if (path.startsWith("/admin")) return ["ARO", "DRO"]; 
  if (path.startsWith("/grades")) return ["ARO"];
  if (path.startsWith("/disciplinary") || path.startsWith("/disciplinaries")) return ["DRO"];
  if (path.startsWith("/enrollments")) return ["ARO", "DRO"];
  if (path.startsWith("/courses")) return ["ARO", "DRO"];
  if (path.startsWith("/reports")) return ["student", "guardian"];
  if (path.startsWith("/students")) return ["ARO", "DRO"]; 
  if (path.startsWith("/profile")) return ["student", "ARO", "guardian", "DRO"]; 
  return null; 
}

export async function proxy(req: NextRequest) {
  const { pathname, hostname } = req.nextUrl;

  if (isPublic(pathname)) return NextResponse.next();

  const user = await getUser(req);
  if (!user) {
    const url = new URL("/login", req.url);
    return NextResponse.redirect(url);
  }

  const roles = allowedRoles(pathname);
  if (roles && !roles.includes(user.role)) {
    const url = new URL("/", req.url);
    return NextResponse.redirect(url);
  }

  if (pathname.startsWith("/dba")) {
    const h = hostname.toLowerCase();
    if (!(h === "localhost" || h === "127.0.0.1") || user.role !== "DBA") {
      const url = new URL("/", req.url);
      return NextResponse.redirect(url);
    }
  }

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