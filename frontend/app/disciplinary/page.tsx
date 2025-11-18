"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type Role = "student" | "ARO" | "guardian" | "DRO";
type Rec = { id: string; student_id?: string; student_name?: string; date: string; staff_id?: string; staff_name?: string; descriptions?: string };

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
  const [errors, setErrors] = useState<{ studentId?: string; date?: string; description?: string }>({});

  useEffect(() => {
    api
      .getProfile()
      .then((res: any) => {
        const r = (res?.user?.role as Role | undefined) || null;
        setRole(r);
      })
      .catch(() => setRole(null));
  }, []);

  const resetForm = () => {
    setForm({ studentId: "", date: "", description: "" });
    setErrors({});
  };

  const validateForm = () => {
    const nextErrors: typeof errors = {};
    if (!form.studentId.trim()) {
      nextErrors.studentId = "Student ID is required";
    }
    if (!form.date.trim()) {
      nextErrors.date = "Date is required";
    } else if (!/^\d{4}-\d{2}-\d{2}$/.test(form.date.trim())) {
      nextErrors.date = "Date must be YYYY-MM-DD";
    }
    if (!form.description || !form.description.trim()) {
      nextErrors.description = "Description is required";
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const load = async (options?: { preserveMsg?: boolean; skipLoading?: boolean }) => {
    if (!options?.skipLoading) setLoading(true);
    setError(null);
    if (!options?.preserveMsg) setMsg(null);
    try {
      if (role !== "DRO") throw new Error("Only DRO staff can view or manage disciplinary records.");
      const list = await api.listDisciplinaryRecords(filters);
      setItems(list || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      if (!options?.skipLoading) setLoading(false);
    }
  };

  useEffect(() => {
    if (role === "DRO") {
      load();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  const save = async () => {
    setLoading(true);
    setError(null);
    setMsg(null);
    try {
      if (role !== "DRO") throw new Error("Only DRO staff can create or edit records.");
      if (!validateForm()) {
        throw new Error("Please fix validation errors");
      }
      if (form.id) {
        await api.updateDisciplinaryRecord(form.id, { date: form.date, description: form.description });
      } else {
        await api.createDisciplinaryRecord({ studentId: form.studentId, date: form.date, description: form.description || "" });
      }
      setMsg(form.id ? "Record updated" : "Record created");
      resetForm();
      await load({ preserveMsg: true, skipLoading: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  const pick = (r: Rec) => {
    if (role !== "DRO") return;
    setForm({ id: r.id, studentId: r.student_id || "", date: r.date, description: r.descriptions });
    setMsg(null);
    setError(null);
    setErrors({});
  };

  const remove = async (recordId: string) => {
    if (role !== "DRO") return;
    const confirmed = window.confirm("Are you sure you want to delete this record?");
    if (!confirmed) return;
    setLoading(true);
    setError(null);
    setMsg(null);
    try {
      await api.deleteDisciplinaryRecord(recordId);
      if (form.id === recordId) {
        resetForm();
      }
      setMsg("Record deleted");
      await load({ preserveMsg: true, skipLoading: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete record");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold">Disciplinary Records</h1>
      <p className="text-sm text-zinc-600">Only DRO staff can view or manage disciplinary actions.</p>
      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        {role === "DRO" && (
          <div className="rounded border p-4">
            <h2 className="mb-2 font-medium">Create / Edit</h2>
            <div className="mb-1 text-xs text-zinc-500">
              {form.id ? `Editing record ${form.id}` : "Creating new record"}
            </div>
            <div className="grid gap-2">
              <input
                className="rounded border px-3 py-2"
                placeholder="Student ID"
                value={form.studentId}
                onChange={(e) => setForm({ ...form, studentId: e.target.value })}
              />
              {errors.studentId && <p className="text-xs text-red-600">{errors.studentId}</p>}
              <input
                className="rounded border px-3 py-2"
                placeholder="Date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
              {errors.date && <p className="text-xs text-red-600">{errors.date}</p>}
              <textarea
                className="rounded border px-3 py-2"
                placeholder="Description"
                rows={3}
                value={form.description || ""}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
              {errors.description && <p className="text-xs text-red-600">{errors.description}</p>}
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
                  onClick={resetForm}
                >
                  Clear
                </button>
              </div>
            </div>
          </div>
        )}
        <div className="rounded border p-4">
          <h2 className="mb-2 font-medium">Search</h2>
          <div className="grid gap-2">
            <input
              className="rounded border px-3 py-2"
              placeholder="Student ID (optional)"
              value={filters.studentId || ""}
              onChange={(e) => setFilters({ ...filters, studentId: e.target.value || undefined })}
            />
            <input
              className="rounded border px-3 py-2"
              placeholder="Date (optional, YYYY-MM-DD)"
              value={filters.date || ""}
              onChange={(e) => setFilters({ ...filters, date: e.target.value || undefined })}
            />
            <button className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-60" disabled={loading} onClick={() => load()}>
              Search
            </button>
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
            items.map((it) => {
              const studentLabel = it.student_name || it.student_id || "Student";
              const staffLabel = it.staff_name || it.staff_id || "Staff";
              return (
                <div key={it.id} className="rounded border p-2 text-left">
                  <div className="text-sm">
                    {studentLabel} · {it.date} · {staffLabel}
                  </div>
                  {it.descriptions && <div className="text-xs text-zinc-700">{it.descriptions}</div>}
                  <div className="mt-2 flex gap-2 text-xs">
                    <button
                      type="button"
                      className="rounded border px-2 py-1 text-blue-600"
                      disabled={loading}
                      onClick={() => pick(it)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="rounded border px-2 py-1 text-red-600"
                      disabled={loading}
                      onClick={() => remove(it.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
