// 客户端加密工具：获取服务器公钥、混合加密并发起安全登录

// 同时支持「响应体混合加密」：
// - 每次请求生成一次性 RSA-OAEP 密钥对；把 clientPublicKeyPem 放入明文信封一并发送
// - 服务端中继若检测到 clientPublicKeyPem，则对 JSON 响应做 AES-GCM 加密，并用该公钥加密 AES 密钥
// - 浏览器用一次性私钥解密响应信封，还原 JSON

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

function derToPem(der: ArrayBuffer, label: string): string {
  const b64 = base64Encode(der);
  const wrapped = (b64.match(/.{1,64}/g) || [b64]).join("\n");
  return `-----BEGIN ${label}-----\n${wrapped}\n-----END ${label}-----`;
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

type EncryptedEnvelope = {
  encryptedKeyBase64: string;
  ivBase64: string;
  ciphertextBase64: string;
  tagBase64: string;
  sigBase64?: string;
};

function isEncryptedEnvelope(obj: unknown): obj is EncryptedEnvelope {
  const o = obj as Record<string, unknown>;
  return !!(
    o && typeof o === "object" &&
    typeof o["encryptedKeyBase64"] === "string" &&
    typeof o["ivBase64"] === "string" &&
    typeof o["ciphertextBase64"] === "string" &&
    typeof o["tagBase64"] === "string"
  );
}

async function decryptHybridResponse(enc: EncryptedEnvelope, clientPrivateKey: CryptoKey): Promise<Json> {
  const encKeyBuf = base64DecodeToBuf(enc.encryptedKeyBase64);
  const ivBuf = base64DecodeToBuf(enc.ivBase64);
  const ctBuf = base64DecodeToBuf(enc.ciphertextBase64);
  const tagBuf = base64DecodeToBuf(enc.tagBase64);
  const combined = new Uint8Array(ctBuf.byteLength + tagBuf.byteLength);
  combined.set(new Uint8Array(ctBuf), 0);
  combined.set(new Uint8Array(tagBuf), new Uint8Array(ctBuf).length);

  // RSA-OAEP 解密 AES 密钥
  const rawAes = await crypto.subtle.decrypt({ name: "RSA-OAEP" }, clientPrivateKey, encKeyBuf);
  const aesKey = await crypto.subtle.importKey("raw", rawAes, { name: "AES-GCM" }, false, ["decrypt"]);

  const plainBuf = await crypto.subtle.decrypt({ name: "AES-GCM", iv: ivBuf }, aesKey, combined.buffer);
  const jsonStr = new TextDecoder().decode(plainBuf);

  // 可选：校验 HMAC 完整性
  if (enc.sigBase64) {
    const hmacKey = await crypto.subtle.importKey("raw", rawAes, { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
    const ok = await crypto.subtle.verify("HMAC", hmacKey, base64DecodeToBuf(enc.sigBase64), new TextEncoder().encode(jsonStr));
    if (!ok) throw new Error("Invalid response HMAC signature");
  }
  return JSON.parse(jsonStr) as Json;
}

async function generateClientKeyPair(): Promise<{ publicPem: string; privateKey: CryptoKey }> {
  const keyPair = await crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["encrypt", "decrypt"]
  );
  const spki = await crypto.subtle.exportKey("spki", keyPair.publicKey);
  const publicPem = derToPem(spki, "PUBLIC KEY");
  return { publicPem, privateKey: keyPair.privateKey };
}

export async function loginSecure(payload: { email: string; password: string }): Promise<Json> {
  const pem = await fetchServerPublicKeyPem();
  const { publicPem, privateKey } = await generateClientKeyPair();
  const envelope: Json = { ...payload, timestamp: Date.now(), nonce: Math.random().toString(16).slice(2), clientPublicKeyPem: publicPem };
  const enc = await encryptHybrid(envelope, pem);
  const res = await fetch("/API/login", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(enc),
  });
  const ct = res.headers.get("content-type") || "";
  const isJson = ct.includes("application/json");
  const payloadRes = isJson ? await res.json() : await res.text();
  if (isJson && isEncryptedEnvelope(payloadRes)) {
    const dec = await decryptHybridResponse(payloadRes as EncryptedEnvelope, privateKey);
    if (!res.ok) {
      const msg = (dec as Record<string, unknown>)?.message || `HTTP ${res.status}`;
      throw new Error(msg as string);
    }
    return dec;
  }
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
  const { publicPem, privateKey } = await generateClientKeyPair();
  const enc = await encryptHybrid({ ...envelope, clientPublicKeyPem: publicPem }, pem);
  const res = await fetch(rel, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(enc),
  });
  const ct = res.headers.get("content-type") || "";
  const isJson = ct.includes("application/json");
  const payloadRes = isJson ? await res.json() : await res.text();
  if (isJson && isEncryptedEnvelope(payloadRes)) {
    const dec = await decryptHybridResponse(payloadRes as EncryptedEnvelope, privateKey);
    if (!res.ok) {
      const msg = (dec as Record<string, unknown>)?.message || `HTTP ${res.status}`;
      throw new Error(msg as string);
    }
    return dec as unknown as T;
  }
  if (!res.ok) {
    const msg = isJson ? (payloadRes as Record<string, unknown>)?.message || `HTTP ${res.status}` : `HTTP ${res.status}`;
    throw new Error(msg as string);
  }
  return (isJson ? (payloadRes as unknown as T) : ((payloadRes as string) as unknown as T));
}