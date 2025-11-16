"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type Role = "student" | "ARO" | "guardian" | "DRO";
type GradeRecord = { id: string; studentId: string; courseId: string; grade: string };

export default function GradesPage() {
  const [role, setRole] = useState<Role | null>(null);
  const [filters, setFilters] = useState<{ studentId?: string; courseId?: string }>({});
  const [items, setItems] = useState<GradeRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [assign, setAssign] = useState<{ studentId: string; courseId: string; grade: string }>({ studentId: "", courseId: "", grade: "" });
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    api
      .getProfile()
      .then((res: any) => {
        const r = (res?.user?.role as Role | undefined) || null;
        setRole(r);
      })
      .catch(() => setRole(null));
  }, []);

  const load = async () => {
    setLoading(true);
    setError(null);
    setMsg(null);
    try {
      const list = await api.listGrades({ studentId: filters.studentId, courseId: filters.courseId });
      setItems(list || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const submit = async () => {
    setLoading(true);
    setError(null);
    setMsg(null);
    try {
      if (role !== "ARO") throw new Error("Read-only");
      await api.assignGrade({ studentId: assign.studentId, courseId: assign.courseId, grade: assign.grade });
      setMsg("Saved");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold">Grades</h1>
      <p className="text-sm text-zinc-600">View grades{role === "ARO" ? " and assign" : ""}.</p>
      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        {role === "ARO" && (
          <div className="rounded border p-4">
            <h2 className="mb-2 font-medium">Assign Grade</h2>
            <div className="grid gap-2">
              <input className="rounded border px-3 py-2" placeholder="Student ID" value={assign.studentId} onChange={(e) => setAssign({ ...assign, studentId: e.target.value })} />
              <input className="rounded border px-3 py-2" placeholder="Course ID" value={assign.courseId} onChange={(e) => setAssign({ ...assign, courseId: e.target.value })} />
              <input className="rounded border px-3 py-2" placeholder="Grade" value={assign.grade} onChange={(e) => setAssign({ ...assign, grade: e.target.value })} />
              <button className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-60" disabled={loading} onClick={submit}>Save</button>
            </div>
          </div>
        )}
        <div className="rounded border p-4">
          <h2 className="mb-2 font-medium">Search</h2>
          <div className="grid gap-2">
            <input className="rounded border px-3 py-2" placeholder="Student ID" value={filters.studentId || ""} onChange={(e) => setFilters({ ...filters, studentId: e.target.value || undefined })} />
            <input className="rounded border px-3 py-2" placeholder="Course ID" value={filters.courseId || ""} onChange={(e) => setFilters({ ...filters, courseId: e.target.value || undefined })} />
            <button className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-60" disabled={loading} onClick={load}>Search</button>
          </div>
        </div>
      </div>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      {msg && <p className="mt-3 text-sm text-green-700">{msg}</p>}
      <div className="mt-6 rounded border p-4">
        <h2 className="mb-2 font-medium">Results</h2>
        <div className="grid gap-2">
          {items.length === 0 ? (
            <p className="text-sm text-zinc-600">No records</p>
          ) : (
            items.map((it) => (
              <div key={it.id} className="rounded border p-2">
                <div className="text-sm">{it.studentId} · {it.courseId} · {it.grade}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}