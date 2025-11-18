export const isProd = process.env.NODE_ENV === "production";

export const COOKIE_NAME_AUTH = "auth";

export const AUTH_COOKIE_MAX_AGE_SECONDS = 24 * 60 * 60; // 1天
export const AUTH_COOKIE_EXP_MS = AUTH_COOKIE_MAX_AGE_SECONDS * 1000;

export const cookieOptionsAuth = {
  httpOnly: true,
  sameSite: "lax" as const,
  // 可通过环境变量控制在无 HTTPS 场景下关闭 Secure（例如仅用公网 IP + HTTP）
  // COOKIE_SECURE=true/1 开启；未设置时默认 isProd
  secure: (() => {
    const v = (process.env.COOKIE_SECURE || "").toLowerCase();
    return v ? v === "1" || v === "true" : isProd;
  })(),
  path: "/",
  // 可选：按需设置跨子域；不设置则由浏览器默认当前域
  domain: process.env.COOKIE_DOMAIN || undefined,
  maxAge: AUTH_COOKIE_MAX_AGE_SECONDS,
};