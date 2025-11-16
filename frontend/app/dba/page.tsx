"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type Role = "student" | "ARO" | "guardian" | "DRO" | "DBA";

export default function DBAPage() {
  const [role, setRole] = useState<Role | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [student, setStudent] = useState({ firstName: "", lastName: "", email: "", password: "", mobile: "" });
  const [guardian, setGuardian] = useState({ firstName: "", lastName: "", email: "", password: "", mobile: "", studentId: "", relation: "other" as "father" | "mother" | "other" });

  useEffect(() => {
    api.getProfile()
      .then((res: any) => setRole((res?.user?.role as Role) || null))
      .catch(() => setRole(null));
  }, []);

  const createStudent = async () => {
    setMsg(null); setError(null);
    try {
      await api.dbaCreateStudent(student);
      setMsg("Student created");
      setStudent({ firstName: "", lastName: "", email: "", password: "", mobile: "" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    }
  };

  const createGuardian = async () => {
    setMsg(null); setError(null);
    try {
      await api.dbaCreateGuardian(guardian);
      setMsg("Guardian created");
      setGuardian({ firstName: "", lastName: "", email: "", password: "", mobile: "", studentId: "", relation: "other" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    }
  };

  const host = typeof window !== "undefined" ? window.location.hostname : "";
  const isLocal = host === "localhost" || host === "127.0.0.1";

  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold">DBA Tools</h1>
      <p className="text-sm text-zinc-600">Create students and guardians (localhost only).</p>
      {!isLocal && <p className="mt-2 text-sm text-red-600">Access restricted to localhost.</p>}
      {role !== "DBA" && <p className="mt-2 text-sm text-red-600">Role DBA required.</p>}

      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <div className="rounded border p-4">
          <h2 className="mb-2 font-medium">Create Student</h2>
          <div className="grid gap-2">
            <input className="rounded border px-3 py-2" placeholder="First Name" value={student.firstName} onChange={(e) => setStudent({ ...student, firstName: e.target.value })} />
            <input className="rounded border px-3 py-2" placeholder="Last Name" value={student.lastName} onChange={(e) => setStudent({ ...student, lastName: e.target.value })} />
            <input className="rounded border px-3 py-2" placeholder="Email" value={student.email} onChange={(e) => setStudent({ ...student, email: e.target.value })} />
            <input className="rounded border px-3 py-2" placeholder="Password" value={student.password} onChange={(e) => setStudent({ ...student, password: e.target.value })} />
            <input className="rounded border px-3 py-2" placeholder="Mobile" value={student.mobile} onChange={(e) => setStudent({ ...student, mobile: e.target.value })} />
            <button className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-60" disabled={!isLocal || role !== "DBA"} onClick={createStudent}>Create</button>
          </div>
        </div>

        <div className="rounded border p-4">
          <h2 className="mb-2 font-medium">Create Guardian</h2>
          <div className="grid gap-2">
            <input className="rounded border px-3 py-2" placeholder="First Name" value={guardian.firstName} onChange={(e) => setGuardian({ ...guardian, firstName: e.target.value })} />
            <input className="rounded border px-3 py-2" placeholder="Last Name" value={guardian.lastName} onChange={(e) => setGuardian({ ...guardian, lastName: e.target.value })} />
            <input className="rounded border px-3 py-2" placeholder="Email" value={guardian.email} onChange={(e) => setGuardian({ ...guardian, email: e.target.value })} />
            <input className="rounded border px-3 py-2" placeholder="Password" value={guardian.password} onChange={(e) => setGuardian({ ...guardian, password: e.target.value })} />
            <input className="rounded border px-3 py-2" placeholder="Mobile" value={guardian.mobile} onChange={(e) => setGuardian({ ...guardian, mobile: e.target.value })} />
            <input className="rounded border px-3 py-2" placeholder="Student ID (optional)" value={guardian.studentId} onChange={(e) => setGuardian({ ...guardian, studentId: e.target.value })} />
            <select className="rounded border px-3 py-2" value={guardian.relation} onChange={(e) => setGuardian({ ...guardian, relation: e.target.value as any })}>
              <option value="father">father</option>
              <option value="mother">mother</option>
              <option value="other">other</option>
            </select>
            <button className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-60" disabled={!isLocal || role !== "DBA"} onClick={createGuardian}>Create</button>
          </div>
        </div>
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      {msg && <p className="mt-3 text-sm text-green-700">{msg}</p>}
    </div>
  );
}