"use client";

import { useEffect, useState } from "react";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { api, type Student } from "@/lib/api";
import { validateName, validateEmail, validateMobile, validateGender, validateAddress, validateIdentificationNumber, validateEnrollmentYear, validatePassword, sanitizeAddress, sanitizeIdentificationNumber, sanitizePassword, sanitizeMobile } from "@/lib/validators";
import NotImplemented from "@/components/ui/NotImplemented";

export default function StudentsPage() {
  const [items, setItems] = useState<Student[]>([]);
  const [query, setQuery] = useState("");
  const [searchError, setSearchError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [notImplemented, setNotImplemented] = useState(false);

  const [form, setForm] = useState<Partial<Student> & { password?: string }>({
    firstName: "",
    lastName: "",
    email: "",
    mobile: "",
    gender: undefined,
    identificationNumber: "",
    address: "",
    enrollmentYear: undefined,
    password: "",
  });
  const [errors, setErrors] = useState<Record<string, string | null>>({});

  const [editingId, setEditingId] = useState<string | null>(null);
  const [edit, setEdit] = useState<Partial<Student>>({});
  const [editErrors, setEditErrors] = useState<Record<string, string | null>>({});

  const load = async (q?: string) => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await api.listStudents(q ? { email: q } : undefined);
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
      mobile: validateMobile(form.mobile || ""),
      gender: validateGender(form.gender || ""),
      identificationNumber: validateIdentificationNumber(form.identificationNumber || ""),
      address: validateAddress(form.address || ""),
      enrollmentYear: validateEnrollmentYear(String(form.enrollmentYear ?? "")),
      password: validatePassword(form.password || ""),
    } as Record<string, string | null>;
    setErrors(next);
    return Object.values(next).every((v) => !v);
  };

  const create = async () => {
    if (!validateCreate()) return;
    setLoading(true);
    setMessage(null);
    try {
      await api.createStudent({
        firstName: form.firstName!,
        lastName: form.lastName!,
        email: form.email!,
        mobile: form.mobile,
        gender: (form.gender || "").toUpperCase() as "M" | "F",
        identificationNumber: form.identificationNumber!,
        address: form.address!,
        enrollmentYear: Number(form.enrollmentYear),
        password: form.password!,
      });
      await load(form.email!);
      setForm({ firstName: "", lastName: "", email: "", mobile: "", gender: undefined, identificationNumber: "", address: "", enrollmentYear: undefined, password: "" });
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
          <NotImplemented endpoint="/API/students" />
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
              placeholder="Search by email"
              maxLength={200}
              value={query}
              onChange={(e) => {
                const val = e.target.value.trimStart();
                setQuery(val);
                setSearchError(val ? validateEmail(val) : null);
              }}
              className={searchError ? "border-red-600 focus:ring-red-300" : ""}
            />
            <Button onClick={() => load(query)} disabled={loading}>
              Search
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setQuery("");
                load("");
                setSearchError(null);
              }}
              disabled={loading}
            >
              Reset
            </Button>
          </div>
          {searchError && (
            <p className="mt-1 text-xs text-red-600">{searchError}</p>
          )}
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
              <label className="mb-1 block text-sm">Password</label>
              <Input
                type="password"
                value={form.password || ""}
                onChange={(e) => {
                  const val = sanitizePassword(e.target.value);
                  setForm((f) => ({ ...f, password: val }));
                  setErrors((prev) => ({ ...prev, password: validatePassword(val) }));
                }}
                className={errors.password ? "border-red-600 focus:ring-red-300" : ""}
              />
              {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password}</p>}
            </div>
            <div>
              <label className="mb-1 block text-sm">Mobile</label>
              <Input
                inputMode="tel"
                maxLength={12}
                value={form.mobile}
                onChange={(e) => {
                  const val = sanitizeMobile(e.target.value);
                  setForm((f) => ({ ...f, mobile: val }));
                  setErrors((prev) => ({ ...prev, mobile: validateMobile(val) }));
                }}
                className={errors.mobile ? "border-red-600 focus:ring-red-300" : ""}
              />
              {errors.mobile && (
                <p className="mt-1 text-xs text-red-600">{errors.mobile}</p>
              )}
            </div>
            <div>
              <label className="mb-1 block text-sm">Gender</label>
              <div className="flex gap-3">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    checked={(form.gender || "").toUpperCase() === "M"}
                    onChange={() => {
                      setForm((f) => ({ ...f, gender: "M" }));
                      setErrors((prev) => ({ ...prev, gender: validateGender("M") }));
                    }}
                  />
                  <span>M</span>
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    checked={(form.gender || "").toUpperCase() === "F"}
                    onChange={() => {
                      setForm((f) => ({ ...f, gender: "F" }));
                      setErrors((prev) => ({ ...prev, gender: validateGender("F") }));
                    }}
                  />
                  <span>F</span>
                </label>
              </div>
              {errors.gender && <p className="mt-1 text-xs text-red-600">{errors.gender}</p>}
            </div>
            <div>
              <label className="mb-1 block text-sm">Identification Number</label>
              <Input
                value={form.identificationNumber || ""}
                maxLength={10}
                onChange={(e) => {
                  const val = sanitizeIdentificationNumber(e.target.value);
                  setForm((f) => ({ ...f, identificationNumber: val }));
                  setErrors((prev) => ({ ...prev, identificationNumber: val ? validateIdentificationNumber(val) : null }));
                }}
                className={errors.identificationNumber ? "border-red-600 focus:ring-red-300" : ""}
              />
              {errors.identificationNumber && <p className="mt-1 text-xs text-red-600">{errors.identificationNumber}</p>}
            </div>
            <div>
              <label className="mb-1 block text-sm">Address</label>
              <Input
                value={form.address || ""}
                maxLength={255}
                onChange={(e) => {
                  const val = sanitizeAddress(e.target.value);
                  setForm((f) => ({ ...f, address: val }));
                  setErrors((prev) => ({ ...prev, address: val ? validateAddress(val) : null }));
                }}
                className={errors.address ? "border-red-600 focus:ring-red-300" : ""}
              />
              {errors.address && <p className="mt-1 text-xs text-red-600">{errors.address}</p>}
            </div>
            <div>
              <label className="mb-1 block text-sm">Enrollment Year</label>
              <Input
                inputMode="numeric"
                value={String(form.enrollmentYear ?? "")}
                maxLength={4}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9]/g, "");
                  setForm((f) => ({ ...f, enrollmentYear: val ? Number(val) : undefined }));
                  setErrors((prev) => ({ ...prev, enrollmentYear: val ? validateEnrollmentYear(val) : "Required" }));
                }}
                className={errors.enrollmentYear ? "border-red-600 focus:ring-red-300" : ""}
              />
              {errors.enrollmentYear && <p className="mt-1 text-xs text-red-600">{errors.enrollmentYear}</p>}
            </div>
            <Button onClick={create} disabled={loading}>
              {loading ? "Submitting..." : "Create Student"}
            </Button>
          </div>
        </Card>

        <Card>
          <h2 className="mb-2 font-medium">Create Guardian</h2>
          <CreateGuardian onCreated={() => setMessage("Guardian created")} />
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

function CreateGuardian({ onCreated }: { onCreated?: () => void }) {
  const [form, setForm] = useState<{ firstName: string; lastName: string; email: string; password: string; mobile?: string; studentId?: string; relation?: "father" | "mother" | "other" }>({ firstName: "", lastName: "", email: "", password: "" });
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const validate = () => {
    const next = {
      firstName: validateName(form.firstName || ""),
      lastName: validateName(form.lastName || ""),
      email: validateEmail(form.email || ""),
      password: form.password ? null : "Required",
      mobile: form.mobile ? validateMobile(form.mobile) : null,
      relation: form.relation && !["father", "mother", "other"].includes(form.relation) ? "Invalid relation" : null,
    } as Record<string, string | null>;
    setErrors(next);
    return Object.values(next).every((v) => !v);
  };

  const submit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    setMsg(null);
    try {
      await api.createGuardian({
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        password: form.password,
        mobile: form.mobile,
        studentId: form.studentId,
        relation: form.relation,
      });
      setForm({ firstName: "", lastName: "", email: "", password: "" });
      setErrors({});
      setMsg("Guardian created");
      onCreated?.();
    } catch (err) {
      setMsg((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-3">
      {msg && <div className="rounded border border-blue-200 bg-blue-50 p-2 text-sm text-blue-800">{msg}</div>}
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
        {errors.firstName && <p className="mt-1 text-xs text-red-600">{errors.firstName}</p>}
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
        {errors.lastName && <p className="mt-1 text-xs text-red-600">{errors.lastName}</p>}
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
        {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
      </div>
      <div>
        <label className="mb-1 block text-sm">Password</label>
        <Input
          type="password"
          value={form.password}
          onChange={(e) => {
            const val = e.target.value;
            setForm((f) => ({ ...f, password: val }));
            setErrors((prev) => ({ ...prev, password: val ? null : "Required" }));
          }}
          className={errors.password ? "border-red-600 focus:ring-red-300" : ""}
        />
        {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password}</p>}
      </div>
      <div>
        <label className="mb-1 block text-sm">Mobile (optional)</label>
        <Input
          inputMode="tel"
          maxLength={12}
          value={form.mobile || ""}
          onChange={(e) => {
            const val = e.target.value;
            setForm((f) => ({ ...f, mobile: val }));
            setErrors((prev) => ({ ...prev, mobile: val ? validateMobile(val) : null }));
          }}
          className={errors.mobile ? "border-red-600 focus:ring-red-300" : ""}
        />
        {errors.mobile && <p className="mt-1 text-xs text-red-600">{errors.mobile}</p>}
      </div>
      <div>
        <label className="mb-1 block text-sm">Student ID (optional)</label>
        <Input
          value={form.studentId || ""}
          maxLength={64}
          onChange={(e) => setForm((f) => ({ ...f, studentId: e.target.value.trim() }))}
        />
      </div>
      <div>
        <label className="mb-1 block text-sm">Relation (optional)</label>
        <select
          className="w-full rounded border px-3 py-2 text-sm"
          value={form.relation || ""}
          onChange={(e) => setForm((f) => ({ ...f, relation: e.target.value as "father" | "mother" | "other" }))}
        >
          <option value="">Select</option>
          <option value="father">father</option>
          <option value="mother">mother</option>
          <option value="other">other</option>
        </select>
        {errors.relation && <p className="mt-1 text-xs text-red-600">{errors.relation}</p>}
      </div>
      <Button onClick={submit} disabled={submitting}>{submitting ? "Submitting..." : "Create Guardian"}</Button>
    </div>
  );
}