"use client";
import { useEffect, useState } from "react";
import { api, type GradeRecord } from "@/lib/api";

type Role = "student" | "ARO" | "guardian" | "DRO";

const emptyAssign = { studentId: "", courseId: "", term: "", grade: "", comments: "" };

export default function GradesPage() {
  const [role, setRole] = useState<Role | null>(null);
  const [filters, setFilters] = useState<{ studentId?: string; courseId?: string }>({});
  const [items, setItems] = useState<GradeRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [assign, setAssign] = useState(emptyAssign);

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
      if (role !== "ARO") throw new Error("Only ARO staff can view/manage grades.");
      const list = await api.listGrades(filters);
      setItems(list || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (role === "ARO") {
      load();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  const submit = async () => {
    setLoading(true);
    setError(null);
    setMsg(null);
    try {
      if (role !== "ARO") throw new Error("Only ARO staff can assign grades.");
      if (!assign.studentId || !assign.courseId || !assign.term || !assign.grade) {
        throw new Error("Student ID, Course ID, Term and Grade are required");
      }
      if (!assign.comments.trim()) {
        throw new Error("Comments are required");
      }
      await api.assignGrade({
        studentId: assign.studentId,
        courseId: assign.courseId,
        term: assign.term,
        grade: assign.grade,
        comments: assign.comments,
      });
      setMsg("Saved");
      setAssign(emptyAssign);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold">Grades</h1>
      <p className="text-sm text-zinc-600">Only ARO staff can access this page.</p>
      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        {role === "ARO" && (
          <div className="rounded border p-4">
            <h2 className="mb-2 font-medium">Assign Grade</h2>
            <div className="grid gap-2">
              <input
                className="rounded border px-3 py-2"
                placeholder="Student ID"
                value={assign.studentId}
                onChange={(e) => setAssign({ ...assign, studentId: e.target.value })}
              />
              <input
                className="rounded border px-3 py-2"
                placeholder="Course ID"
                value={assign.courseId}
                onChange={(e) => setAssign({ ...assign, courseId: e.target.value })}
              />
              <input
                className="rounded border px-3 py-2"
                placeholder="Term (e.g. 2024-S1)"
                value={assign.term}
                onChange={(e) => setAssign({ ...assign, term: e.target.value })}
              />
              <input
                className="rounded border px-3 py-2"
                placeholder="Grade (e.g. 85 or A-)"
                value={assign.grade}
                onChange={(e) => setAssign({ ...assign, grade: e.target.value })}
              />
              <textarea
                className="rounded border px-3 py-2"
                placeholder="Comments (required)"
                value={assign.comments}
                onChange={(e) => setAssign({ ...assign, comments: e.target.value })}
              />
              <button
                className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-60"
                disabled={loading}
                onClick={submit}
              >
                Save
              </button>
            </div>
          </div>
        )}
        <div className="rounded border p-4">
          <h2 className="mb-2 font-medium">Search Records</h2>
          <div className="grid gap-2">
            <input
              className="rounded border px-3 py-2"
              placeholder="Student ID (optional)"
              value={filters.studentId || ""}
              onChange={(e) => setFilters({ ...filters, studentId: e.target.value || undefined })}
            />
            <input
              className="rounded border px-3 py-2"
              placeholder="Course ID (optional)"
              value={filters.courseId || ""}
              onChange={(e) => setFilters({ ...filters, courseId: e.target.value || undefined })}
            />
            <button
              className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-60"
              disabled={loading}
              onClick={load}
            >
              Search
            </button>
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
                <div className="text-sm">
                  {it.studentId} · {it.courseId}
                  {it.term ? ` · ${it.term}` : ""}
                  {" · "}
                  {it.grade}
                </div>
                {it.comments && <div className="text-xs text-zinc-600">Comments: {it.comments}</div>}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
