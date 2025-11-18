"use client";
import { useEffect, useState } from "react";
import { api, type ProfileResponse } from "@/lib/api";

type Role = "student" | "ARO" | "guardian" | "DRO";
type Rec = { id: string; student_id?: string; student_name?: string; date: string; staff_id?: string; staff_name?: string; descriptions?: string };

export default function DisciplinaryPage() {
  const [role, setRole] = useState<Role | null>(null);
  const [filters, setFilters] = useState<{ studentId?: string; date?: string }>({});
  const [items, setItems] = useState<Rec[]>([]);
  const [loading, setLoading] = useState(false);
  const [recordsError, setRecordsError] = useState<string | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [createActionError, setCreateActionError] = useState<string | null>(null);
  const [editActionError, setEditActionError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState<{ studentId: string; date: string; description?: string }>({
    studentId: "",
    date: "",
    description: "",
  });
  const [createErrors, setCreateErrors] = useState<{ studentId?: string; date?: string; description?: string }>({});
  const [editForm, setEditForm] = useState<{ id?: string; date: string; description?: string }>({
    id: undefined,
    date: "",
    description: "",
  });
  const [editErrors, setEditErrors] = useState<{ date?: string; description?: string }>({});
  const [editInfo, setEditInfo] = useState<{ student?: string; staff?: string }>({});

  useEffect(() => {
    api
      .getProfile()
      .then((res: ProfileResponse) => {
        const r = (res?.user?.role as Role | undefined) || null;
        setRole(r);
      })
      .catch(() => setRole(null));
  }, []);

  const resetCreateForm = () => {
    setCreateForm({ studentId: "", date: "", description: "" });
    setCreateErrors({});
  };

  const resetEditForm = () => {
    setEditForm({ id: undefined, date: "", description: "" });
    setEditErrors({});
    setEditInfo({});
  };

  const validateCreate = () => {
    const nextErrors: typeof createErrors = {};
    if (!createForm.studentId.trim()) {
      nextErrors.studentId = "Student ID is required";
    }
    if (!createForm.date.trim()) {
      nextErrors.date = "Date is required";
    } else if (!/^\d{4}-\d{2}-\d{2}$/.test(createForm.date.trim())) {
      nextErrors.date = "Date must be YYYY-MM-DD";
    }
    if (!createForm.description || !createForm.description.trim()) {
      nextErrors.description = "Description is required";
    }
    setCreateErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const validateEdit = () => {
    const nextErrors: typeof editErrors = {};
    if (!editForm.date.trim()) {
      nextErrors.date = "Date is required";
    } else if (!/^\d{4}-\d{2}-\d{2}$/.test(editForm.date.trim())) {
      nextErrors.date = "Date must be YYYY-MM-DD";
    }
    if (!editForm.description || !editForm.description.trim()) {
      nextErrors.description = "Description is required";
    }
    setEditErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const load = async (options?: { preserveMsg?: boolean; skipLoading?: boolean; context?: "search" | "refresh" | "init" }) => {
    if (!options?.skipLoading) setLoading(true);
    setRecordsError(null);
    if (options?.context === "search") {
      setSearchError(null);
    }
    if (!options?.preserveMsg) setMsg(null);
    try {
      if (role !== "DRO") throw new Error("Only DRO staff can view or manage disciplinary records.");
      const list = await api.listDisciplinaryRecords(filters);
      setItems(list || []);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed";
      setRecordsError(message);
      if (options?.context === "search") {
        setSearchError(message);
      }
    } finally {
      if (!options?.skipLoading) setLoading(false);
    }
  };

  useEffect(() => {
    if (role === "DRO") {
      load({ context: "init" });
    }
    
  }, [role]);

  const createRecord = async () => {
    setLoading(true);
    setCreateActionError(null);
    setRecordsError(null);
    setMsg(null);
    try {
      if (role !== "DRO") throw new Error("Only DRO staff can create records.");
      if (!validateCreate()) {
        throw new Error("Please fix validation errors");
      }
      await api.createDisciplinaryRecord({
        studentId: createForm.studentId,
        date: createForm.date,
        description: createForm.description || "",
      });
      setMsg("Record created");
      resetCreateForm();
      await load({ preserveMsg: true, skipLoading: true, context: "refresh" });
    } catch (e) {
      setCreateActionError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  const updateRecord = async () => {
    setLoading(true);
    setEditActionError(null);
    setRecordsError(null);
    setMsg(null);
    try {
      if (role !== "DRO") throw new Error("Only DRO staff can edit records.");
      if (!editForm.id) throw new Error("Select a record to edit");
      if (!validateEdit()) {
        throw new Error("Please fix validation errors");
      }
      await api.updateDisciplinaryRecord(editForm.id, {
        date: editForm.date,
        description: editForm.description,
      });
      setMsg("Record updated");
      resetEditForm();
      await load({ preserveMsg: true, skipLoading: true, context: "refresh" });
    } catch (e) {
      setEditActionError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  const pick = (r: Rec) => {
    if (role !== "DRO") return;
    setEditForm({ id: r.id, date: r.date, description: r.descriptions || "" });
    const studentDisplay = r.student_name && r.student_id ? `${r.student_name} (${r.student_id})` : r.student_name || r.student_id;
    const staffDisplay = r.staff_name && r.staff_id ? `${r.staff_name} (${r.staff_id})` : r.staff_name || r.staff_id;
    setEditInfo({
      student: studentDisplay,
      staff: staffDisplay,
    });
    setMsg(null);
    setEditActionError(null);
    setEditErrors({});
  };

  const remove = async (recordId: string) => {
    if (role !== "DRO") return;
    const confirmed = window.confirm("Are you sure you want to delete this record?");
    if (!confirmed) return;
    setLoading(true);
    setRecordsError(null);
    setSearchError(null);
    setMsg(null);
    try {
      await api.deleteDisciplinaryRecord(recordId);
      if (editForm.id === recordId) {
        resetEditForm();
      }
      setMsg("Record deleted");
      await load({ preserveMsg: true, skipLoading: true, context: "refresh" });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to delete record";
      setRecordsError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold">Disciplinary Records</h1>
      <p className="text-sm text-zinc-600">Only DRO staff can view or manage disciplinary actions.</p>
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {role === "DRO" && (
          <>
            <div className="rounded border p-4">
              <h2 className="mb-2 font-medium">Create Record</h2>
              <div className="grid gap-2">
                <input
                  className="rounded border px-3 py-2"
                  placeholder="Student ID"
                  value={createForm.studentId}
                  onChange={(e) => setCreateForm({ ...createForm, studentId: e.target.value })}
                />
                {createErrors.studentId && <p className="text-xs text-red-600">{createErrors.studentId}</p>}
                <input
                  className="rounded border px-3 py-2"
                  placeholder="Date (YYYY-MM-DD)"
                  value={createForm.date}
                  onChange={(e) => setCreateForm({ ...createForm, date: e.target.value })}
                />
                {createErrors.date && <p className="text-xs text-red-600">{createErrors.date}</p>}
                <textarea
                  className="rounded border px-3 py-2"
                  placeholder="Description"
                  rows={3}
                  value={createForm.description || ""}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                />
                {createErrors.description && <p className="text-xs text-red-600">{createErrors.description}</p>}
                <div className="flex gap-2">
                  <button
                    className="flex-1 rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-60"
                    disabled={loading}
                    onClick={createRecord}
                  >
                    Create
                  </button>
                  <button
                    type="button"
                    className="rounded border px-3 py-2 text-sm"
                    disabled={loading}
                    onClick={resetCreateForm}
                  >
                    Clear
                  </button>
                </div>
                {createActionError && <p className="text-xs text-red-600">{createActionError}</p>}
              </div>
            </div>
            <div className="rounded border p-4">
              <h2 className="mb-2 font-medium">Edit Record</h2>
              <div className="mb-1 text-xs text-zinc-500">
                {editForm.id ? `Editing record ${editForm.id}` : "Select a record below to edit"}
              </div>
              {editInfo.student && (
                <div className="mb-2 text-xs text-zinc-600">
                  {editInfo.student} · {editInfo.staff ? `Staff: ${editInfo.staff}` : ""}
                </div>
              )}
              <div className="grid gap-2">
                <input
                  className="rounded border px-3 py-2"
                  placeholder="Date (YYYY-MM-DD)"
                  value={editForm.date}
                  onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                  disabled={!editForm.id}
                />
                {editErrors.date && <p className="text-xs text-red-600">{editErrors.date}</p>}
                <textarea
                  className="rounded border px-3 py-2"
                  placeholder="Description"
                  rows={3}
                  value={editForm.description || ""}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  disabled={!editForm.id}
                />
                {editErrors.description && <p className="text-xs text-red-600">{editErrors.description}</p>}
                <div className="flex gap-2">
                  <button
                    className="flex-1 rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-60"
                    disabled={loading || !editForm.id}
                    onClick={updateRecord}
                  >
                    Update
                  </button>
                  <button
                    type="button"
                    className="rounded border px-3 py-2 text-sm"
                    disabled={loading || !editForm.id}
                    onClick={resetEditForm}
                  >
                    Cancel
                  </button>
                </div>
                {editActionError && <p className="text-xs text-red-600">{editActionError}</p>}
              </div>
            </div>
          </>
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
            <button
              className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-60"
              disabled={loading}
              onClick={() => load({ context: "search" })}
            >
              Search
            </button>
          </div>
          {searchError && <p className="mt-2 text-xs text-red-600">{searchError}</p>}
        </div>
      </div>
      {msg && <p className="mt-3 text-sm text-green-700">{msg}</p>}
      <div className="mt-6 rounded border p-4">
        <h2 className="mb-2 font-medium">Records</h2>
        {recordsError && <p className="mb-2 text-xs text-red-600">{recordsError}</p>}
        <div className="grid gap-2">
          {items.length === 0 ? (
            <p className="text-sm text-zinc-600">No records</p>
          ) : (
            items.map((it) => {
              const studentLabel = it.student_name && it.student_id ? `${it.student_name} (${it.student_id})` : it.student_name || it.student_id || "Student";
              const staffLabel = it.staff_name && it.staff_id ? `${it.staff_name} (${it.staff_id})` : it.staff_name || it.staff_id || "Staff";
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
