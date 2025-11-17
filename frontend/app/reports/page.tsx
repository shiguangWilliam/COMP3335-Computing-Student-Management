"use client";
import { useEffect, useState } from "react";
import { api, type ReportBundle } from "@/lib/api";

type Role = "student" | "ARO" | "guardian" | "DRO";

export default function ReportsPage() {
  const [role, setRole] = useState<Role | null>(null);
  const [reports, setReports] = useState<ReportBundle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      try {
        const prof = await api.getProfile();
        if (!mounted) return;
        const r = (prof?.user?.role as Role | undefined) || null;
        setRole(r);
        if (r === "student" || r === "guardian") {
          const data = await api.fetchSelfReports();
          if (!mounted) return;
          setReports(data);
        } else {
          setReports([]);
        }
        setError(null);
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : "加载失败");
        setReports([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    init();
    return () => {
      mounted = false;
    };
  }, []);

  const notAllowed = role && role !== "student" && role !== "guardian";

  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold">Reports</h1>
      <p className="text-sm text-zinc-600">学生与监护人可在此查看与自己相关的成绩和违纪记录。</p>
      {loading && <p className="mt-4 text-sm text-zinc-600">加载中...</p>}
      {notAllowed && !loading && <p className="mt-4 text-sm text-zinc-600">当前角色无权访问此页面，请使用学生或监护人账号登录。</p>}
      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      {!loading && !notAllowed && !error && (
        <div className="mt-6 space-y-4">
          {reports.length === 0 ? (
            <div className="rounded border p-4 text-sm text-zinc-600">暂未查询到任何记录。</div>
          ) : (
            reports.map((bundle, idx) => (
              <div key={idx} className="rounded border p-4">
                <h2 className="mb-3 font-medium">记录 {idx + 1}</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  <section>
                    <h3 className="mb-2 text-sm font-semibold">Grades</h3>
                    {bundle.grade.length === 0 ? (
                      <p className="text-sm text-zinc-600">暂无成绩记录</p>
                    ) : (
                      <ul className="space-y-2 text-sm">
                        {bundle.grade.map((g) => (
                          <li key={g.id} className="rounded border px-3 py-2">
                            <div>
                              {g.courseId} {g.term ? `· ${g.term}` : ""}
                            </div>
                            <div className="text-zinc-600">Grade: {g.grade}</div>
                            {g.comments && <div className="text-xs text-zinc-500">Comments: {g.comments}</div>}
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                  <section>
                    <h3 className="mb-2 text-sm font-semibold">Disciplinary</h3>
                    {bundle.disciplinary.length === 0 ? (
                      <p className="text-sm text-zinc-600">暂无违纪记录</p>
                    ) : (
                      <ul className="space-y-2 text-sm">
                        {bundle.disciplinary.map((d) => (
                          <li key={d.id} className="rounded border px-3 py-2">
                            <div>
                              {d.date} · Staff: {d.staff_id}
                            </div>
                            {d.descriptions && <div className="text-xs text-zinc-500">{d.descriptions}</div>}
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
