import { randomBytes, createCipheriv, createDecipheriv } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

/**
 * Encrypts a plaintext token using AES-256-GCM.
 * @param plainText The plaintext to encrypt.
 * @param secretKey 64-character hex string (32 bytes).
 * @returns A formatted string `ivHex:authTagHex:encryptedHex` suitable for database storage.
 */
export function encryptToken(plainText: string, secretKey: string): string {
  if (!plainText) {
    throw new Error("Missing text to encrypt");
  }

  const keyBuffer = secretKey ? Buffer.from(secretKey, "hex") : Buffer.alloc(0);
  if (keyBuffer.length !== 32) {
    throw new Error("Secret key must be exactly 64 hex characters (32 bytes) for AES-256-GCM");
  }

  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, keyBuffer, iv);

  let encrypted = cipher.update(plainText, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");

  return `${iv.toString("hex")}:${authTag}:${encrypted}`;
}

/**
 * Decrypts an AES-256-GCM encrypted payload.
 * @param encryptedPayload Format `ivHex:authTagHex:encryptedHex`
 * @param secretKey 64-character hex string (32 bytes).
 * @returns The original plaintext token.
 */
export function decryptToken(encryptedPayload: string, secretKey: string): string {
  if (!encryptedPayload) {
    throw new Error("Missing payload to decrypt");
  }

  const keyBuffer = secretKey ? Buffer.from(secretKey, "hex") : Buffer.alloc(0);
  if (keyBuffer.length !== 32) {
    throw new Error("Secret key must be exactly 64 hex characters (32 bytes) for AES-256-GCM");
  }

  const parts = encryptedPayload.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted payload format");
  }

  const [ivHex, authTagHex, encryptedHex] = parts;

  if (!ivHex || !authTagHex || !encryptedHex) {
    throw new Error("Invalid encrypted payload parts");
  }

  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");

  const decipher = createDecipheriv(ALGORITHM, keyBuffer, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedHex, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}
