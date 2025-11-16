"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import Button from "@/components/ui/Button";
import { useRouter, usePathname } from "next/navigation";

type Role = "student" | "ARO" | "guardian" | "DRO" | "DBA";
type UserInfo = { email: string; role: Role; name?: string };
type User = UserInfo | null;

export default function NavBar() {
  const [user, setUser] = useState<User>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    let mounted = true;
    api
      .getProfile()
      .then((res: any) => {
        if (!mounted) return;
        const u = res?.user as UserInfo | undefined;
        setUser(u ? { email: u.email, role: u.role, name: u.name } : null);
      })
      .catch(() => setUser(null));
    return () => {
      mounted = false;
    };
  }, [pathname]);

  const logout = async () => {
    try {
      await api.logout();
      setUser(null);
      router.refresh();
      router.push("/login");
    } catch {}
  };

  const canSee = (path: string) => {
    if (!user) return false;
    const role = user.role;
    if (path === "/profile") return true;
    if (path === "/grades") return role === "ARO";
    if (path === "/reports") return role === "student" || role === "guardian";
    if (path === "/disciplinary") return role === "DRO";
    if (path === "/dba") {
      const host = typeof window !== "undefined" ? window.location.hostname : "";
      return role === "DBA" && (host === "localhost" || host === "127.0.0.1");
    }
    return false;
  };

  return (
    <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur shadow-sm">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/" className="text-lg font-semibold">ComputingU SMS</Link>
        <nav className="flex flex-wrap items-center gap-4 text-sm">
          {canSee("/grades") && <Link href="/grades" className="hover:underline">Grades</Link>}
          {canSee("/reports") && <Link href="/reports" className="hover:underline">Reports</Link>}
          {canSee("/disciplinary") && <Link href="/disciplinary" className="hover:underline">Disciplinary</Link>}
          {canSee("/dba") && <Link href="/dba" className="hover:underline">DBA</Link>}
          <span className="mx-2 h-4 w-px bg-zinc-300" aria-hidden="true" />
          {user ? (
            <>
              <span className="text-zinc-700">{(user.name || user.email)} · {user.role}</span>
              <Link href="/profile" className="hover:underline text-blue-700">Profile</Link>
              <Button size="sm" variant="outline" onClick={logout}>Logout</Button>
            </>
          ) : (
            <>
              <Link href="/login" className="hover:underline text-blue-700">Login</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}