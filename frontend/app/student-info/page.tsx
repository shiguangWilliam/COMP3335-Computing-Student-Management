"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";

type Role = "student" | "ARO" | "guardian" | "DRO";
type Student = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  mobile?: string;
  gender?: "M" | "F";
  identificationNumber?: string;
  address?: string;
  enrollmentYear?: number;
};

export default function StudentInfoPage() {
  const params = useSearchParams();
  const [role, setRole] = useState<Role | null>(null);
  const [query, setQuery] = useState<{ id?: string; email?: string }>({
    id: params.get("id") || undefined,
    email: params.get("email") || undefined,
  });
  const [record, setRecord] = useState<Student | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getProfile()
      .then((res: any) => {
        const r = (res?.user?.role as Role | undefined) || null;
        setRole(r);
      })
      .catch(() => setRole(null));
  }, []);

  const search = async () => {
    setLoading(true);
    setError(null);
    setRecord(null);
    try {
      const list = await api.listStudents({ id: query.id, email: query.email });
      setRecord(list?.[0] || null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (query.id || query.email) search();
  }, [query.id, query.email]);

  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold">Student Info</h1>
      <p className="text-sm text-zinc-600">Read-only student information.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <input
          className="rounded border px-3 py-2"
          placeholder="Student ID"
          value={query.id || ""}
          onChange={(e) => setQuery({ ...query, id: e.target.value || undefined })}
        />
        <input
          className="rounded border px-3 py-2"
          placeholder="Email"
          value={query.email || ""}
          onChange={(e) => setQuery({ ...query, email: e.target.value || undefined })}
        />
      </div>
      <div className="mt-3">
        <button
          className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-60"
          disabled={loading}
          onClick={search}
        >
          Search
        </button>
      </div>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      <div className="mt-6 rounded border p-4">
        {record ? (
          <div className="grid gap-2">
            <div className="font-medium">{record.firstName} {record.lastName}</div>
            <div className="text-sm text-zinc-700">ID: {record.id}</div>
            <div className="text-sm text-zinc-700">Email: {record.email}</div>
            {record.mobile && <div className="text-sm text-zinc-700">Mobile: {record.mobile}</div>}
            {record.gender && <div className="text-sm text-zinc-700">Gender: {record.gender}</div>}
            {record.identificationNumber && <div className="text-sm text-zinc-700">ID No.: {record.identificationNumber}</div>}
            {record.address && <div className="text-sm text-zinc-700">Address: {record.address}</div>}
            {typeof record.enrollmentYear === "number" && (
              <div className="text-sm text-zinc-700">Enrollment Year: {record.enrollmentYear}</div>
            )}
          </div>
        ) : (
          <p className="text-sm text-zinc-600">No data</p>
        )}
      </div>
    </div>
  );
}