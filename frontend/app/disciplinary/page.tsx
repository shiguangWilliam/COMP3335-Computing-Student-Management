"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type Role = "student" | "ARO" | "guardian" | "DRO";
type Rec = { id: string; studentId: string; date: string; staffId: string; description?: string };

export default function DisciplinaryPage() {
  const [role, setRole] = useState<Role | null>(null);
  const [filters, setFilters] = useState<{ studentId?: string; staffId?: string; date?: string }>({});
  const [items, setItems] = useState<Rec[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [form, setForm] = useState<{ id?: string; studentId: string; date: string; staffId: string; description?: string }>({ studentId: "", date: "", staffId: "", description: "" });

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
      const list = await api.listDisciplinaryRecords({ studentId: filters.studentId, staffId: filters.staffId, date: filters.date });
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
      if (role !== "DRO") throw new Error("Read-only");
      if (form.id) {
        await api.updateDisciplinaryRecord(form.id, { studentId: form.studentId, date: form.date, staffId: form.staffId, description: form.description });
      } else {
        await api.createDisciplinaryRecord({ studentId: form.studentId, date: form.date, staffId: form.staffId, description: form.description });
      }
      setMsg("Saved");
      setForm({ studentId: "", date: "", staffId: "", description: "" });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  const pick = (r: Rec) => {
    if (role !== "DRO") return;
    setForm({ id: r.id, studentId: r.studentId, date: r.date, staffId: r.staffId, description: r.description });
  };

  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold">Disciplinary Records</h1>
      <p className="text-sm text-zinc-600">View records{role === "DRO" ? " and manage" : ""}.</p>
      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        {role === "DRO" && (
          <div className="rounded border p-4">
            <h2 className="mb-2 font-medium">Create / Edit</h2>
            <div className="grid gap-2">
              <input className="rounded border px-3 py-2" placeholder="Student ID" value={form.studentId} onChange={(e) => setForm({ ...form, studentId: e.target.value })} />
              <input className="rounded border px-3 py-2" placeholder="Date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              <input className="rounded border px-3 py-2" placeholder="Staff ID" value={form.staffId} onChange={(e) => setForm({ ...form, staffId: e.target.value })} />
              <input className="rounded border px-3 py-2" placeholder="Description" value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              <button className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-60" disabled={loading} onClick={save}>Save</button>
            </div>
          </div>
        )}
        <div className="rounded border p-4">
          <h2 className="mb-2 font-medium">Search</h2>
          <div className="grid gap-2">
            <input className="rounded border px-3 py-2" placeholder="Student ID" value={filters.studentId || ""} onChange={(e) => setFilters({ ...filters, studentId: e.target.value || undefined })} />
            <input className="rounded border px-3 py-2" placeholder="Staff ID" value={filters.staffId || ""} onChange={(e) => setFilters({ ...filters, staffId: e.target.value || undefined })} />
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
                <div className="text-sm">{it.studentId} · {it.date} · {it.staffId}</div>
                {it.description && <div className="text-xs text-zinc-700">{it.description}</div>}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}