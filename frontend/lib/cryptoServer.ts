import crypto from "crypto";

type KeyPair = { publicKeyPem: string; privateKeyPem: string };

const RSA_BITS = 2048;
const OAEP_HASH = "sha256";

function generateKeyPair(): KeyPair {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
    modulusLength: RSA_BITS,
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });
  return { publicKeyPem: publicKey, privateKeyPem: privateKey };
}

let cached: KeyPair | null = null;

export function getServerKeyPair(): KeyPair {
  if (cached) return cached;
  const pub = process.env.SERVER_RSA_PUBLIC_PEM;
  const prv = process.env.SERVER_RSA_PRIVATE_PEM;
  if (pub && prv) {
    cached = { publicKeyPem: pub, privateKeyPem: prv };
    return cached;
  }
  cached = generateKeyPair();
  return cached;
}

export type HybridEncryptedPayload = {
  encryptedKeyBase64: string; // 被RSA-OAEP加密的AES密钥
  ivBase64: string; // IV
  ciphertextBase64: string; // 密文
  tagBase64: string; // 字节鉴别标签
  sigBase64?: string; //HMAC
};

export function decryptHybridJson(payload: HybridEncryptedPayload): Record<string, unknown> {
  const { privateKeyPem } = getServerKeyPair();
  const encryptedKey = Buffer.from(payload.encryptedKeyBase64, "base64");
  const iv = Buffer.from(payload.ivBase64, "base64");
  const ciphertext = Buffer.from(payload.ciphertextBase64, "base64");
  const tag = Buffer.from(payload.tagBase64, "base64");

  const aesKey = crypto.privateDecrypt(
    { key: privateKeyPem, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING, oaepHash: OAEP_HASH },
    encryptedKey
  );

  if (aesKey.length !== 32) {
    throw new Error("Invalid AES key length");
  }
  const decipher = crypto.createDecipheriv("aes-256-gcm", aesKey, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  const jsonStr = decrypted.toString("utf8");

  if (payload.sigBase64) {
    const expectedSig = crypto.createHmac("sha256", aesKey).update(jsonStr, "utf8").digest("base64");
    if (expectedSig !== payload.sigBase64) {
      throw new Error("Invalid HMAC signature");
    }
  }
  return JSON.parse(jsonStr) as Record<string, unknown>;
}