"use client";

import { useState } from "react";
import { api, LoginPayload } from "@/lib/api";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { useRouter } from "next/navigation";
import { validateEmail } from "@/lib/validators";

export default function LoginPage() {
  const [form, setForm] = useState<LoginPayload>({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    const nextErrors = {
      email: validateEmail(form.email || ""),
    };
    setErrors(nextErrors);
    if (!form.email || !form.password || Object.values(nextErrors).some(Boolean)) {
      setMessage("Please correct the highlighted fields");
      return;
    }
    setLoading(true);
    try {
      
      const res = await api.login(form);
      setMessage("Logged in");
      // 刷新
      router.refresh();
      // 登录成功后统一跳转到首页
      router.push("/");
    } catch (err) {
      setMessage((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-4 text-2xl font-semibold">Login</h1>
      {message && (
        <div className="mb-4 rounded border p-3 text-sm">{message}</div>
      )}
      <Card>
        <form onSubmit={onSubmit} className="space-y-4">
          {}
          <div>
            <label className="mb-1 block text-sm">Email</label>
          <Input
            type="email"
            maxLength={254}
            autoComplete="email"
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
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                maxLength={72}
                value={form.password}
                onChange={(e) => {
                  const val = e.target.value;
                  setForm((f) => ({ ...f, password: val }));
                }}
                className="pr-10"
              />
              <button
                type="button"
                aria-label={showPassword ? "Hide Password" : "Show Password"}
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 z-10 text-zinc-600 hover:text-zinc-800"
              >
                {showPassword ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12c2-5 6-8 11-8s9 3 11 8-4 8-11 8S3 17 1 12Z" />
                    <circle cx="12" cy="12" r="3" />
                    <line x1="2" y1="2" x2="22" y2="22" />
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12c2-5 6-8 11-8s9 3 11 8-4 8-11 8S3 17 1 12Z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Submitting..." : "Login"}
          </Button>
        </form>
      </Card>
    </div>
  );
}