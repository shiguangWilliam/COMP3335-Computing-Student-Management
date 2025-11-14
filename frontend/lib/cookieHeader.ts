export type SameSitePolicy = "Lax" | "Strict" | "None";

export function ensureSameSite(setCookieHeader: string, policy: SameSitePolicy = "Lax"): string {
  if (!setCookieHeader) return setCookieHeader;
  if (/\bsamesite\s*=\s*/i.test(setCookieHeader)) return setCookieHeader;
  return `${setCookieHeader}; SameSite=${policy}`;
}