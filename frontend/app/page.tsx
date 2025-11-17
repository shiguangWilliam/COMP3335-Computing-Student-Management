"use client";
import Link from "next/link";
import Card from "@/components/ui/Card";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type Role = "student" | "ARO" | "guardian" | "DRO" | "DBA";

export default function Home() {
  const [role, setRole] = useState<Role | null>(null);
  const [userName, setUserName] = useState<string>("");
  
  useEffect(() => {
    let mounted = true;
    api
      .getProfile()
      .then((res: any) => {
        if (!mounted) return;
        const r = (res?.user?.role as Role | undefined) || null;
        const name = res?.user?.name || res?.user?.email || "";
        setRole(r);
        setUserName(name);
      })
      .catch(() => {
        setRole(null);
        setUserName("");
      });
    return () => {
      mounted = false;
    };
  }, []);

  const modules = [
    // 个人信息（所有角色）
    ...(role ? [{ href: "/profile", title: "Profile", desc: "View and edit your personal information" }] : []),
    // 成绩管理（ARO）
    ...(role === "ARO" ? [{ href: "/grades", title: "Grades", desc: "Assign and view student grades" }] : []),
    // 违纪管理（DRO）
    ...(role === "DRO" ? [{ href: "/disciplinary", title: "Disciplinary", desc: "Manage disciplinary records" }] : []),
    // 报表查看（学生/监护人）
    ...(role === "student" || role === "guardian"
      ? [{ href: "/reports", title: "Reports", desc: "View your grades and disciplinary records" }]
      : []),
    // 数据库管理（DBA，仅本地）
    ...(role === "DBA" && (typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"))
      ? [{ href: "/dba", title: "DBA Panel", desc: "Database administration (localhost only)" }]
      : []),
  ];

  return (
    <div>
      <h1 className="mb-2 text-3xl font-semibold">ComputingU 学生管理系统</h1>
      {role ? (
        <p className="mb-6 text-sm text-zinc-600">
          欢迎, <span className="font-medium">{userName}</span> ({role})
        </p>
      ) : (
        <p className="mb-6 text-sm text-zinc-600">
          请先 <Link href="/login" className="text-blue-700 hover:underline">登录</Link> 以使用本系统。
        </p>
      )}
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {modules.length === 0 ? (
          <li className="col-span-full">
            <Card className="text-center py-8">
              <p className="text-zinc-600">暂无可用功能模块</p>
              <Link href="/login" className="mt-2 inline-block text-blue-700 hover:underline">
                前往登录
              </Link>
            </Card>
          </li>
        ) : (
          modules.map((m) => (
            <li key={m.href}>
              <Card className="hover:shadow-md transition-shadow h-full flex flex-col">
                <Link href={m.href} className="font-medium text-lg text-blue-700 hover:underline">
                  {m.title}
                </Link>
                <p className="mt-2 text-sm text-zinc-600 flex-1">{m.desc}</p>
              </Card>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
