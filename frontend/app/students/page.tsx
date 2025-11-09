"use client";

import { useEffect, useState } from "react";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { api, type Student } from "@/lib/api";
import { validateName, validateEmail, validateMobile } from "@/lib/validators";
import NotImplemented from "@/components/ui/NotImplemented";

export default function StudentsPage() {
  const [items, setItems] = useState<Student[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [notImplemented, setNotImplemented] = useState(false);

  const [form, setForm] = useState<Partial<Student>>({
    firstName: "",
    lastName: "",
    email: "",
    mobile: "",
  });
  const [errors, setErrors] = useState<Record<string, string | null>>({});

  const [editingId, setEditingId] = useState<string | null>(null);
  const [edit, setEdit] = useState<Partial<Student>>({});
  const [editErrors, setEditErrors] = useState<Record<string, string | null>>({});

  const load = async (q?: string) => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await api.listStudents(q ? { q } : undefined);
      setItems(res);
    } catch (err) {
      const msg = (err as Error).message || "";
      if (msg.startsWith("NOT_IMPLEMENTED")) {
        setNotImplemented(true);
        setMessage(null);
      } else {
        setMessage(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const validateCreate = () => {
    const next = {
      firstName: validateName(form.firstName || ""),
      lastName: validateName(form.lastName || ""),
      email: validateEmail(form.email || ""),
      mobile: form.mobile ? validateMobile(form.mobile) : null,
    };
    setErrors(next);
    return Object.values(next).every((v) => !v);
  };

  const create = async () => {
    if (!validateCreate()) return;
    setLoading(true);
    setMessage(null);
    try {
      const created = await api.createStudent({
        firstName: form.firstName!,
        lastName: form.lastName!,
        email: form.email!,
        mobile: form.mobile,
      });
      setItems((prev) => [created, ...prev]);
      setForm({ firstName: "", lastName: "", email: "", mobile: "" });
      setMessage("Student created");
    } catch (err) {
      setMessage((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (s: Student) => {
    setEditingId(s.id);
    setEdit({
      firstName: s.firstName,
      lastName: s.lastName,
      email: s.email,
      mobile: s.mobile,
    });
    setEditErrors({});
  };

  const saveEdit = async (id: string) => {
    const nextEditErrors = {
      firstName: validateName(edit.firstName || ""),
      lastName: validateName(edit.lastName || ""),
      email: validateEmail(edit.email || ""),
      mobile: edit.mobile ? validateMobile(edit.mobile) : null,
    };
    setEditErrors(nextEditErrors);
    if (!Object.values(nextEditErrors).every((v) => !v)) return;
    setLoading(true);
    setMessage(null);
    try {
      const updated = await api.updateStudent(id, {
        firstName: edit.firstName!,
        lastName: edit.lastName!,
        email: edit.email!,
        mobile: edit.mobile,
      });
      setItems((prev) => prev.map((it) => (it.id === id ? updated : it)));
      setEditingId(null);
      setEdit({});
      setMessage("Student updated");
    } catch (err) {
      setMessage((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this student?")) return;
    setLoading(true);
    setMessage(null);
    try {
      await api.deleteStudent(id);
      setItems((prev) => prev.filter((it) => it.id !== id));
      setMessage("Student deleted");
    } catch (err) {
      setMessage((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  if (notImplemented) {
    return (
      <div>
        <h1 className="mb-2 text-2xl font-semibold">Students</h1>
        <p className="text-sm text-zinc-600">该模块的后端接口暂未实现。</p>
        <div className="mt-4">
          <NotImplemented endpoint="/API/function/students" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-2 text-2xl font-semibold">Students</h1>
      <p className="text-sm text-zinc-600">Search, create, update, and delete student records.</p>

      {message && (
        <div className="mt-4 rounded border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">{message}</div>
      )}

      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <Card>
          <h2 className="mb-2 font-medium">Search</h2>
          <div className="flex items-center gap-2">
            <Input
              placeholder="Search by name, email or ID"
              maxLength={200}
              value={query}
              onChange={(e) => setQuery(e.target.value.trimStart())}
            />
            <Button onClick={() => load(query)} disabled={loading}>
              Search
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setQuery("");
                load("");
              }}
              disabled={loading}
            >
              Reset
            </Button>
          </div>
        </Card>

        <Card>
          <h2 className="mb-2 font-medium">Create</h2>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-sm">First Name</label>
              <Input
                value={form.firstName}
                maxLength={50}
                onChange={(e) => {
                  const val = e.target.value;
                  setForm((f) => ({ ...f, firstName: val }));
                  setErrors((prev) => ({ ...prev, firstName: val ? validateName(val) : null }));
                }}
                className={errors.firstName ? "border-red-600 focus:ring-red-300" : ""}
              />
              {errors.firstName && (
                <p className="mt-1 text-xs text-red-600">{errors.firstName}</p>
              )}
            </div>
            <div>
              <label className="mb-1 block text-sm">Last Name</label>
              <Input
                value={form.lastName}
                maxLength={50}
                onChange={(e) => {
                  const val = e.target.value;
                  setForm((f) => ({ ...f, lastName: val }));
                  setErrors((prev) => ({ ...prev, lastName: val ? validateName(val) : null }));
                }}
                className={errors.lastName ? "border-red-600 focus:ring-red-300" : ""}
              />
              {errors.lastName && (
                <p className="mt-1 text-xs text-red-600">{errors.lastName}</p>
              )}
            </div>
            <div>
              <label className="mb-1 block text-sm">Email</label>
              <Input
                type="email"
                autoComplete="email"
                maxLength={254}
                value={form.email}
                onChange={(e) => {
                  const val = e.target.value;
                  setForm((f) => ({ ...f, email: val }));
                  setErrors((prev) => ({ ...prev, email: val ? validateEmail(val) : null }));
                }}
                className={errors.email ? "border-red-600 focus:ring-red-300" : ""}
              />
              {errors.email && (
                <p className="mt-1 text-xs text-red-600">{errors.email}</p>
              )}
            </div>
            <div>
              <label className="mb-1 block text-sm">Mobile (optional)</label>
              <Input
                inputMode="tel"
                maxLength={12}
                value={form.mobile}
                onChange={(e) => {
                  const val = e.target.value;
                  setForm((f) => ({ ...f, mobile: val }));
                  setErrors((prev) => ({ ...prev, mobile: val ? validateMobile(val) : null }));
                }}
                className={errors.mobile ? "border-red-600 focus:ring-red-300" : ""}
              />
              {errors.mobile && (
                <p className="mt-1 text-xs text-red-600">{errors.mobile}</p>
              )}
            </div>
            <Button onClick={create} disabled={loading}>
              {loading ? "Submitting..." : "Create Student"}
            </Button>
          </div>
        </Card>
      </div>

      <Card className="mt-6">
        <h2 className="mb-2 font-medium">Results</h2>
        {loading && <p className="text-sm text-zinc-600">Loading...</p>}
        {!loading && items.length === 0 && (
          <p className="text-sm text-zinc-600">No students found.</p>
        )}
        {!loading && items.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-2 pr-4">Name</th>
                  <th className="py-2 pr-4">Email</th>
                  <th className="py-2 pr-4">Mobile</th>
                  <th className="py-2 pr-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((s) => (
                  <tr key={s.id} className="border-b align-top hover:bg-zinc-50">
                    <td className="py-2 pr-4">
                      {editingId === s.id ? (
                        <div className="flex gap-2">
                          <Input
                            value={edit.firstName || ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              setEdit((v) => ({ ...v, firstName: val }));
                              setEditErrors((prev) => ({ ...prev, firstName: val ? validateName(val) : null }));
                            }}
                            className={editErrors.firstName ? "border-red-600 focus:ring-red-300" : ""}
                          />
                          <Input
                            value={edit.lastName || ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              setEdit((v) => ({ ...v, lastName: val }));
                              setEditErrors((prev) => ({ ...prev, lastName: val ? validateName(val) : null }));
                            }}
                            className={editErrors.lastName ? "border-red-600 focus:ring-red-300" : ""}
                          />
                        </div>
                      ) : (
                        <span>
                          {s.firstName} {s.lastName}
                        </span>
                      )}
                      {editingId === s.id && (
                        <div>
                          {editErrors.firstName && (
                            <p className="mt-1 text-xs text-red-600">{editErrors.firstName}</p>
                          )}
                          {editErrors.lastName && (
                            <p className="mt-1 text-xs text-red-600">{editErrors.lastName}</p>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="py-2 pr-4">
                      {editingId === s.id ? (
                        <Input
                          type="email"
                          value={edit.email || ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            setEdit((v) => ({ ...v, email: val }));
                            setEditErrors((prev) => ({ ...prev, email: val ? validateEmail(val) : null }));
                          }}
                          className={editErrors.email ? "border-red-600 focus:ring-red-300" : ""}
                        />
                      ) : (
                        s.email
                      )}
                      {editingId === s.id && editErrors.email && (
                        <p className="mt-1 text-xs text-red-600">{editErrors.email}</p>
                      )}
                    </td>
                    <td className="py-2 pr-4">
                      {editingId === s.id ? (
                        <Input
                          inputMode="tel"
                          value={edit.mobile || ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            setEdit((v) => ({ ...v, mobile: val }));
                            setEditErrors((prev) => ({ ...prev, mobile: val ? validateMobile(val) : null }));
                          }}
                          className={editErrors.mobile ? "border-red-600 focus:ring-red-300" : ""}
                        />
                      ) : (
                        s.mobile || "—"
                      )}
                      {editingId === s.id && editErrors.mobile && (
                        <p className="mt-1 text-xs text-red-600">{editErrors.mobile}</p>
                      )}
                    </td>
                    <td className="py-2 pr-4">
                      {editingId === s.id ? (
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => saveEdit(s.id)}>
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingId(null);
                              setEdit({});
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => startEdit(s)}>
                            Edit
                          </Button>
                          <Button size="sm" variant="danger" onClick={() => remove(s.id)}>
                            Delete
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}