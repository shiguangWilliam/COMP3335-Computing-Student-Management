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
  const res = await fetch("/API/crypto/public-key", { method: "GET" });
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

  return {
    encryptedKeyBase64: base64Encode(encryptedKey),
    ivBase64: base64Encode(ivBuf),
    ciphertextBase64: base64Encode(ciphertext.buffer),
    tagBase64: base64Encode(tag.buffer),
  };
}

export async function loginSecure(payload: { email: string; password: string }): Promise<Json> {
  const pem = await fetchServerPublicKeyPem();
  const enc = await encryptHybrid(payload, pem);
  const res = await fetch("/API/secure/login", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(enc),
  });
  const ct = res.headers.get("content-type") || "";
  if (!res.ok) {
    const msg = ct.includes("application/json") ? (await res.json()).message : `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return ct.includes("application/json") ? ((await res.json()) as Json) : ((await res.text()) as unknown as Json);
}