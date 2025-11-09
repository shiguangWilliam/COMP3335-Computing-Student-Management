export const isProd = process.env.NODE_ENV === "production";

// Cookie 名称
export const COOKIE_NAME_AUTH = "auth";

// 过期时间（秒 / 毫秒）
export const AUTH_COOKIE_MAX_AGE_SECONDS = 24 * 60 * 60; // 1 day
export const AUTH_COOKIE_EXP_MS = AUTH_COOKIE_MAX_AGE_SECONDS * 1000;

// Cookie 选项（服务端）
export const cookieOptionsAuth = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: isProd, //测试时无需配置，上线后要设置为true
  path: "/",
  // 可选：按需设置跨子域；不设置则由浏览器默认当前域
  domain: process.env.COOKIE_DOMAIN || undefined,
  maxAge: AUTH_COOKIE_MAX_AGE_SECONDS,
};