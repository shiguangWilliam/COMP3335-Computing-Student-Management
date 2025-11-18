export const isProd = process.env.NODE_ENV === "production";

export const COOKIE_NAME_AUTH = "auth";

export const AUTH_COOKIE_MAX_AGE_SECONDS = 24 * 60 * 60; // 1天
export const AUTH_COOKIE_EXP_MS = AUTH_COOKIE_MAX_AGE_SECONDS * 1000;

export const cookieOptionsAuth = {
  httpOnly: true,
  sameSite: "lax" as const,
  
  secure: (() => {
    const v = (process.env.COOKIE_SECURE || "").toLowerCase();
    return v ? v === "1" || v === "true" : isProd;
  })(),
  path: "/",
  //设置跨子域
  domain: process.env.COOKIE_DOMAIN || undefined,
  maxAge: AUTH_COOKIE_MAX_AGE_SECONDS,
};