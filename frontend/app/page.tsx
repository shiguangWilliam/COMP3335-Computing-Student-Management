"use client";
import Link from "next/link";
import Card from "@/components/ui/Card";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type Role = "student" | "ARO" | "guardian" | "DRO";

export default function Home() {
  const [role, setRole] = useState<Role | null>(null);
  useEffect(() => {
    let mounted = true;
    api
      .getProfile()
      .then((res: any) => {
        if (!mounted) return;
        const r = (res?.user?.role as Role | undefined) || null;
        setRole(r);
      })
      .catch(() => setRole(null));
    return () => {
      mounted = false;
    };
  }, []);

  const modules = [
    // 仅 ARO 才能访问成绩管理
    ...(role === "ARO" ? [{ href: "/grades", title: "Grades", desc: "Assign and view grades (ARO only)" }] : []),
    // 仅 DRO 才能访问违纪管理
    ...(role === "DRO" ? [{ href: "/disciplinary", title: "Disciplinary", desc: "Manage disciplinary records (DRO only)" }] : []),
    // 学生/监护人查看自身信息走 /reports
    ...(role === "student" || role === "guardian"
      ? [{ href: "/reports", title: "Reports", desc: "View your grades and disciplinary records" }]
      : []),
  ];

  return (
    <div>
      <h1 className="mb-2 text-3xl font-semibold">ComputingU 学生管理系统</h1>
      <p className="mb-6 text-sm text-zinc-600">请选择角色以开始使用本系统。</p>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {modules.length === 0 ? (
          <li className="text-sm text-zinc-600">请先登录或切换有权限的角色。</li>
        ) : (
          modules.map((m) => (
            <li key={m.href}>
              <Card className="hover:shadow transition-shadow">
                <Link href={m.href} className="font-medium text-blue-700 hover:underline">
                  {m.title}
                </Link>
                <p className="mt-1 text-sm text-zinc-600">{m.desc}</p>
              </Card>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
