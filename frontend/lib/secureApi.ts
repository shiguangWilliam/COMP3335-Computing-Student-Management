// 客户端加密工具：获取服务器公钥、混合加密并发起安全登录

type Json = Record<string, unknown>;

function base64Encode(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin);
}

function base64DecodeToBuf(b64: string): ArrayBuffer {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

function pemToSpkiDer(pem: string): ArrayBuffer {
  const body = pem.replace(/-----BEGIN PUBLIC KEY-----/g, "")
    .replace(/-----END PUBLIC KEY-----/g, "")
    .replace(/\s+/g, "");
  return base64DecodeToBuf(body);
}

async function importServerPublicKey(pubPem: string): Promise<CryptoKey> {
  const der = pemToSpkiDer(pubPem);
  return crypto.subtle.importKey(
    "spki",
    der,
    { name: "RSA-OAEP", hash: "SHA-256" },
    true,
    ["encrypt"]
  );
}

export async function fetchServerPublicKeyPem(): Promise<string> {
  const res = await fetch("/API/public-key", { method: "GET" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = (await res.json()) as { publicKeyPem: string };
  if (!data.publicKeyPem) throw new Error("No public key");
  return data.publicKeyPem;
}

function getRandomBytes(len: number): Uint8Array {
  const buf = new Uint8Array(len);
  crypto.getRandomValues(buf);
  return buf;
}

async function encryptHybrid(payload: Json, pubPem: string) {
  const rsaPub = await importServerPublicKey(pubPem);
  const aesKey = await crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt"]
  );
  const rawAes = await crypto.subtle.exportKey("raw", aesKey);
  const iv = getRandomBytes(12);
  const ivBuf = iv.buffer as ArrayBuffer;

  const enc = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: ivBuf },
    aesKey,
    new TextEncoder().encode(JSON.stringify(payload))
  );
  // WebCrypto 返回的是 ciphertext||tag，末尾 16 字节为 tag
  const encBytes = new Uint8Array(enc);
  const tag = encBytes.slice(encBytes.length - 16);
  const ciphertext = encBytes.slice(0, encBytes.length - 16);

  const encryptedKey = await crypto.subtle.encrypt(
    { name: "RSA-OAEP" },
    rsaPub,
    rawAes
  );

  // 计算 HMAC-SHA256 签名以增强完整性校验（与 GCM tag 相互独立）
  const hmacKey = await crypto.subtle.importKey(
    "raw",
    rawAes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sigBuf = await crypto.subtle.sign("HMAC", hmacKey, new TextEncoder().encode(JSON.stringify(payload)));

  return {
    encryptedKeyBase64: base64Encode(encryptedKey),
    ivBase64: base64Encode(ivBuf),
    ciphertextBase64: base64Encode(ciphertext.buffer),
    tagBase64: base64Encode(tag.buffer),
    sigBase64: base64Encode(sigBuf),
  };
}

export async function loginSecure(payload: { email: string; password: string }): Promise<Json> {
  const pem = await fetchServerPublicKeyPem();
  const enc = await encryptHybrid(payload, pem);
  const res = await fetch("/API/login", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(enc),
  });
  const ct = res.headers.get("content-type") || "";
  const isJson = ct.includes("application/json");
  const payloadRes = isJson ? await res.json() : await res.text();
  if (!res.ok) {
    const msg = isJson ? (payloadRes as Record<string, unknown>)?.message || `HTTP ${res.status}` : `HTTP ${res.status}`;
    throw new Error(msg as string);
  }
  return isJson ? (payloadRes as Json) : ((payloadRes as string) as unknown as Json);
}

// 通用加密请求：单层 /API/* 安全端点，直接投递到对应路由
export async function secureRequest<T>(path: string, options?: { method?: string; body?: Json }): Promise<T> {
  const method = (options?.method || "GET").toUpperCase();
  // 解析查询参数并计算相对路径
  const url = new URL(path, typeof window === "undefined" ? "http://localhost" : window.location.origin);
  const rel = url.pathname; // 单层 /API/* 路径，直接投递到同名安全端点
  const query: Record<string, string> = {};
  url.searchParams.forEach((v, k) => {
    query[k] = v;
  });

  const envelope: Json = {
    method,
    ...(Object.keys(query).length > 0 ? { query } : {}),
    ...(options?.body ? { body: options.body } : {}),
    timestamp: Date.now(),
    nonce: Math.random().toString(16).slice(2),
  };

  const pem = await fetchServerPublicKeyPem();
  const enc = await encryptHybrid(envelope, pem);
  const res = await fetch(rel, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(enc),
  });
  const ct = res.headers.get("content-type") || "";
  const isJson = ct.includes("application/json");
  const payloadRes = isJson ? await res.json() : await res.text();
  if (!res.ok) {
    const msg = isJson ? (payloadRes as Record<string, unknown>)?.message || `HTTP ${res.status}` : `HTTP ${res.status}`;
    throw new Error(msg as string);
  }
  return (isJson ? (payloadRes as unknown as T) : ((payloadRes as string) as unknown as T));
}