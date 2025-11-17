"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type Role = "student" | "ARO" | "guardian" | "DRO";
type Rec = { id: string; student_id: string; date: string; staff_id: string; descriptions?: string };

export default function DisciplinaryPage() {
  const [role, setRole] = useState<Role | null>(null);
  const [filters, setFilters] = useState<{ studentId?: string; date?: string }>({});
  const [items, setItems] = useState<Rec[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [form, setForm] = useState<{ id?: string; studentId: string; date: string; description?: string }>({
    studentId: "",
    date: "",
    description: "",
  });

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
      if (role !== "DRO") throw new Error("仅 DRO 可以查看/管理违纪记录");
      if (role !== "DRO") throw new Error("只有 DRO 可以查看/管理记录")
      if (!filters.studentId || !filters.date) throw new Error("查询需要同时填写 Student ID 和 Date")
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

  const save = async () => {
    setLoading(true);
    setError(null);
    setMsg(null);
    try {
      if (role !== "DRO") throw new Error("仅 DRO 可以管理违纪记录");
      if (!form.studentId || !form.date) throw new Error("Student ID 与 Date 为必填");
      if (!form.description || !form.description.trim()) throw new Error("Description 为必填");
      if (form.id) {
        await api.updateDisciplinaryRecord(form.id, { date: form.date, description: form.description });
      if (role !== "DRO") throw new Error("只有 DRO 可以管理记录")
      if (!form.studentId || !form.date) throw new Error("Student ID 和 Date 为必填")
      if (!form.description || !form.description.trim()) throw new Error("Description 为必填")
      setMsg("Saved");
      setForm({ studentId: "", date: "", description: "" });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  const pick = (r: Rec) => {
    if (role !== "DRO") return;
    setForm({ id: r.id, studentId: r.student_id, date: r.date, description: r.descriptions });
  };

  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold">Disciplinary Records</h1>
      <p className="text-sm text-zinc-600">仅 DRO 可查看/管理违纪记录。</p>
      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        {role === "DRO" && (
          <div className="rounded border p-4">
            <h2 className="mb-2 font-medium">Create / Edit</h2>
            <div className="mb-1 text-xs text-zinc-500">
              {form.id ? `Editing record ${form.id}` : "Creating new record"}
            </div>
      <p className="text-sm text-zinc-600">仅 DRO 可查看/管理记录。</p>
              <input
                className="rounded border px-3 py-2"
                placeholder="Student ID"
                value={form.studentId}
                onChange={(e) => setForm({ ...form, studentId: e.target.value })}
              />
              <input
                className="rounded border px-3 py-2"
                placeholder="Date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
              <input
                className="rounded border px-3 py-2"
                placeholder="Description"
                value={form.description || ""}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
              <div className="flex gap-2">
                <button
                  className="flex-1 rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-60"
                  disabled={loading}
                  onClick={save}
                >
                  {form.id ? "Update" : "Create"}
                </button>
                <button
                  type="button"
                  className="rounded border px-3 py-2 text-sm"
                  disabled={loading}
                  onClick={() => setForm({ studentId: "", date: "", description: "" })}
                >
                  New
                </button>
              </div>
            </div>
          </div>
        )}
                <div className="text-sm">{it.student_id} · {it.date} · {it.staff_id}</div>
          <h2 className="mb-2 font-medium">Search</h2>
          <div className="grid gap-2">
            <input className="rounded border px-3 py-2" placeholder="Student ID" value={filters.studentId || ""} onChange={(e) => setFilters({ ...filters, studentId: e.target.value || undefined })} />
            <input className="rounded border px-3 py-2" placeholder="Date" value={filters.date || ""} onChange={(e) => setFilters({ ...filters, date: e.target.value || undefined })} />
            <button className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-60" disabled={loading} onClick={load}>Search</button>
          </div>
        </div>
      </div>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      {msg && <p className="mt-3 text-sm text-green-700">{msg}</p>}
      <div className="mt-6 rounded border p-4">
        <h2 className="mb-2 font-medium">Records</h2>
        <div className="grid gap-2">
          {items.length === 0 ? (
            <p className="text-sm text-zinc-600">No records</p>
          ) : (
            items.map((it) => (
              <button key={it.id} className="rounded border p-2 text-left" onClick={() => pick(it)}>
                <div className="text-sm">{it.student_id} · {it.date} · {it.staff_id}</div>
                {it.descriptions && <div className="text-xs text-zinc-700">{it.descriptions}</div>}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
