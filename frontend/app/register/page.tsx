"use client";

import { useState } from "react";
import { api, RegisterPayload } from "@/lib/api";
import { validateName, validateEmail, validatePassword, validateMobile } from "@/lib/validators";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

export default function RegisterPage() {
  const [form, setForm] = useState<RegisterPayload>({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    mobile: "",
  });
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(true);

  const validateAll = () => {
    const next = {
      firstName: validateName(form.firstName),
      lastName: validateName(form.lastName),
      email: validateEmail(form.email),
      password: validatePassword(form.password),
      mobile: validateMobile(form.mobile),
    };
    setErrors(next);
    return Object.values(next).every((v) => !v);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    if (!validateAll()) return;
    setLoading(true);
    try {
      const res = await api.register(form);
      setMessage(typeof res === "string" ? res : "Registered successfully");
    } catch (err) {
      setMessage((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-4 text-2xl font-semibold">Register</h1>
      <p className="mb-6 text-sm text-zinc-600">All fields are required. First/Last name letters only (≤ 50). Email allows letters/numbers/underscore with '@' and '.' separators. Password uses only letters/numbers/_/*. Mobile allows digits with optional leading '+', max 11 digits.</p>
      {message && (
        <div className="mb-4 rounded border p-3 text-sm">{message}</div>
      )}
      <Card>
        <form onSubmit={onSubmit} className="space-y-4">
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
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            maxLength={72}
            value={form.password}
            onChange={(e) => {
              const val = e.target.value;
              setForm((f) => ({ ...f, password: val }));
              setErrors((prev) => ({ ...prev, password: val ? validatePassword(val) : null }));
            }}
            className={errors.password ? "border-red-600 focus:ring-red-300" : ""}
          />
          <label className="mt-2 inline-flex items-center gap-2 text-sm text-zinc-700">
            <input
              type="checkbox"
              checked={showPassword}
              onChange={(e) => setShowPassword(e.target.checked)}
            />
            显示密码
          </label>
          {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password}</p>}
        </div>
        <div>
          <label className="mb-1 block text-sm">Mobile</label>
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
          {errors.mobile && <p className="mt-1 text-xs text-red-600">{errors.mobile}</p>}
        </div>
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Submitting..." : "Create account"}
        </Button>
        </form>
      </Card>
    </div>
  );
}