"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

type Role = "student" | "ARO" | "guardian" | "DRO";

export default function ProfilePage() {
  const router = useRouter();
  const [data, setData] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [changing, setChanging] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const [edit, setEdit] = useState<Record<string, string>>({});
  const [editPassword, setEditPassword] = useState<string>("");
  const [oldPassword, setOldPassword] = useState<string>("");
  const [newPassword, setNewPassword] = useState<string>("");

  useEffect(() => {
    let mounted = true;
    api
      .getProfile()
      .then((res: any) => {
        if (!mounted) return;
        setData(res || null);
      })
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
    return () => {
      mounted = false;
    };
  }, []);

  const user = (data?.user || null) as { email?: string; role?: Role; name?: string } | null;
  const kv: { key: string; value: string }[] = [];
  if (data) {
    for (const k of Object.keys(data)) {
      if (["user", "ok", "message", "error", "code"].includes(k)) continue;
      const v = String((data as any)[k] ?? "");
      kv.push({ key: k, value: v });
    }
  }

  const label = (k: string) =>
    k
      .split("_")
      .map((s) => s ? s[0].toUpperCase() + s.slice(1) : s)
      .join(" ");

  const allowedEdit = (r?: Role) => {
    // must align with backend forbidden list: names/emails are not editable in UI
    if (r === "student") return ["phone", "address"];
    if (r === "guardian") return ["phone"];
    if (r === "ARO" || r === "DRO") return ["phone", "address"];
    return [];
  };

  useEffect(() => {
    const fields = allowedEdit(user?.role);
    const next: Record<string, string> = {};
    for (const f of fields) {
      const v = (data as any)?.[f];
      next[f] = v ? String(v) : "";
    }
    setEdit(next);
  }, [data?.user?.role, data]);

  const camel = (k: string) => (k === "first_name" ? "firstName" : k === "last_name" ? "lastName" : k === "phone" ? "mobile" : k);

  const submitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setError(null);
    setProfileError(null);
    setSaving(true);
    try {
      const payload: Record<string, string> = { password: editPassword } as any;
      for (const [k, v] of Object.entries(edit)) payload[camel(k)] = v;
      const res = await api.updateProfile(payload);
      setMessage(String((res as any)?.message || "Updated"));
      const fresh = await api.getProfile();
      setData(fresh || null);
      router.refresh();
    } catch (err) {
      setProfileError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const submitPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setError(null);
    setPasswordError(null);
    setChanging(true);
    try {
      const res = await api.updatePassword({ oldPassword, newPassword });
      setMessage(String((res as any)?.message || "Password updated"));
      await api.logout();
      router.refresh();
      router.push("/login");
    } catch (err) {
      setPasswordError((err as Error).message);
    } finally {
      setChanging(false);
    }
  };

  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold">Profile</h1>
      <div className="grid gap-6 sm:grid-cols-2">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-lg font-medium">{user?.name || user?.email || ""}</div>
              <div className="text-sm text-zinc-600">{user?.email || ""}</div>
            </div>
            <span className="rounded bg-blue-100 px-2 py-1 text-sm text-blue-800">{user?.role || ""}</span>
          </div>
        </Card>
        <Card>
          {loading && <p className="text-sm text-zinc-600">Loading...</p>}
          {error && <p className="text-sm text-red-600">{error}</p>}
          {message && <p className="text-sm text-green-700">{message}</p>}
          {!loading && !error && kv.length === 0 && (
            <p className="text-sm text-zinc-600">No profile fields available.</p>
          )}
          {!loading && !error && kv.length > 0 && (
            <div className="grid gap-2 sm:grid-cols-2">
              {kv.map((item) => (
                <div key={item.key} className="flex justify-between">
                  <span className="text-sm text-zinc-500">{label(item.key)}</span>
                  <span className="text-sm text-zinc-800">{item.value}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
        <Card>
          <h2 className="mb-2 font-medium">Edit Profile</h2>
          <form onSubmit={submitEdit} className="space-y-2">
            {allowedEdit(user?.role).map((f) => (
              <div key={f} className="grid grid-cols-3 items-center gap-2">
                <label className="text-sm text-zinc-600">{label(f)}</label>
                <div className="col-span-2">
                  <Input value={edit[f] || ""} onChange={(e) => setEdit((s) => ({ ...s, [f]: e.target.value }))} />
                </div>
              </div>
            ))}
            <div className="grid grid-cols-3 items-center gap-2">
              <label className="text-sm text-zinc-600">Password</label>
              <div className="col-span-2">
                <Input type="password" placeholder="Enter your current password to confirm profile changes" value={editPassword} onChange={(e) => setEditPassword(e.target.value)} />
                <p className="mt-1 text-xs text-zinc-500">We verify this password before applying your updates.</p>
                {profileError && <p className="mt-1 text-sm text-red-600">{profileError}</p>}
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
            </div>
          </form>
        </Card>
        <Card>
          <h2 className="mb-2 font-medium">Change Password</h2>
          <form onSubmit={submitPassword} className="space-y-2">
            <div className="grid grid-cols-3 items-center gap-2">
              <label className="text-sm text-zinc-600">Old Password</label>
              <div className="col-span-2">
                <Input type="password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-3 items-center gap-2">
              <label className="text-sm text-zinc-600">New Password</label>
              <div className="col-span-2">
                <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="submit" variant="secondary" disabled={changing}>{changing ? "Updating..." : "Update"}</Button>
            </div>
            {passwordError && <p className="text-sm text-red-600">{passwordError}</p>}
          </form>
        </Card>
      </div>
    </div>
  );
}
