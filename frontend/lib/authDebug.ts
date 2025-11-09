import fs from "fs/promises";
import path from "path";

export type Account = {
  email: string;
  role: "student" | "ARO" | "guardian" | "DRO";
  password: string;
  name?: string;
};

export function envAuthDebug(): boolean {
  const v = process.env.AUTH_DEBUG || "";
  return v === "true" || v === "1";
}

export async function loadLocalAccounts(): Promise<Account[]> {
  try {
    const filePath = path.resolve(process.cwd(), "test_acount");
    const raw = await fs.readFile(filePath, "utf8");
    const json = JSON.parse(raw);
    const accounts = Array.isArray(json?.accounts) ? (json.accounts as Account[]) : [];
    return accounts;
  } catch {
    return [];
  }
}

export async function validateLocalLogin(
  email: string,
  password: string
): Promise<Account | null> {
  const accounts = await loadLocalAccounts();
  const acc = accounts.find((a) => a.email === email && a.password === password);
  return acc || null;
}