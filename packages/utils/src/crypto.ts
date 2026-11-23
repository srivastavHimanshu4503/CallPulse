import { randomBytes, createCipheriv, createDecipheriv } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

export interface KeyRing {
  [version: string]: string; // version string -> 64-character hex key (32 bytes)
}

function resolveKey(secretKeyOrKeyRing: string | KeyRing, version?: string): Buffer {
  let hexKey: string | undefined;

  if (typeof secretKeyOrKeyRing === "string") {
    hexKey = secretKeyOrKeyRing;
  } else if (secretKeyOrKeyRing && typeof secretKeyOrKeyRing === "object") {
    if (version && secretKeyOrKeyRing[version]) {
      hexKey = secretKeyOrKeyRing[version];
    } else if (secretKeyOrKeyRing["default"]) {
      hexKey = secretKeyOrKeyRing["default"];
    } else if (secretKeyOrKeyRing["v1"]) {
      hexKey = secretKeyOrKeyRing["v1"];
    } else {
      const firstKey = Object.values(secretKeyOrKeyRing)[0];
      hexKey = firstKey;
    }
  }

  const keyBuffer = hexKey ? Buffer.from(hexKey, "hex") : Buffer.alloc(0);
  if (keyBuffer.length !== 32) {
    throw new Error("Secret key must be exactly 64 hex characters (32 bytes) for AES-256-GCM");
  }
  return keyBuffer;
}

/**
 * Encrypts a plaintext token using AES-256-GCM (legacy 3-part format).
 * @param plainText The plaintext to encrypt.
 * @param secretKey 64-character hex string (32 bytes).
 * @returns A formatted string `ivHex:authTagHex:encryptedHex` suitable for database storage.
 */
export function encryptToken(plainText: string, secretKey: string): string {
  if (!plainText) {
    throw new Error("Missing text to encrypt");
  }

  const keyBuffer = resolveKey(secretKey);
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, keyBuffer, iv);

  let encrypted = cipher.update(plainText, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");

  return `${iv.toString("hex")}:${authTag}:${encrypted}`;
}

/**
 * Encrypts a plaintext token using AES-256-GCM with a versioned envelope header.
 * Format: `version:ivHex:authTagHex:encryptedHex`.
 * Enables zero-downtime key rotation via AWS KMS or managed secret rotation.
 */
export function encryptTokenVersioned(
  plainText: string,
  secretKeyOrKeyRing: string | KeyRing,
  version = "v1",
): string {
  if (!plainText) {
    throw new Error("Missing text to encrypt");
  }

  const keyBuffer = resolveKey(secretKeyOrKeyRing, version);
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, keyBuffer, iv);

  let encrypted = cipher.update(plainText, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");

  return `${version}:${iv.toString("hex")}:${authTag}:${encrypted}`;
}

/**
 * Decrypts an AES-256-GCM encrypted payload.
 * Supports both legacy unversioned payloads (`ivHex:authTagHex:encryptedHex`)
 * and versioned payloads (`version:ivHex:authTagHex:encryptedHex`).
 *
 * @param encryptedPayload Format `iv:tag:ciphertext` or `version:iv:tag:ciphertext`.
 * @param secretKeyOrKeyRing 64-character hex string or KeyRing dictionary.
 * @returns The original plaintext token.
 */
export function decryptToken(
  encryptedPayload: string,
  secretKeyOrKeyRing: string | KeyRing,
): string {
  if (!encryptedPayload) {
    throw new Error("Missing payload to decrypt");
  }

  const parts = encryptedPayload.split(":");
  let version: string | undefined;
  let ivHex: string | undefined;
  let authTagHex: string | undefined;
  let encryptedHex: string | undefined;

  if (parts.length === 4) {
    // Versioned envelope format: version:iv:tag:ciphertext
    version = parts[0];
    ivHex = parts[1];
    authTagHex = parts[2];
    encryptedHex = parts[3];
  } else if (parts.length === 3) {
    // Legacy unversioned format: iv:tag:ciphertext
    ivHex = parts[0];
    authTagHex = parts[1];
    encryptedHex = parts[2];
  } else {
    throw new Error("Invalid encrypted payload format");
  }

  if (!ivHex || !authTagHex || !encryptedHex) {
    throw new Error("Invalid encrypted payload parts");
  }

  const keyBuffer = resolveKey(secretKeyOrKeyRing, version);
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");

  const decipher = createDecipheriv(ALGORITHM, keyBuffer, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedHex, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

/**
 * Rotates an encrypted token to a new key version without exposing plaintext to persistence.
 * Decrypts using the existing key version, then immediately re-encrypts using the new target version.
 */
export function rotateTokenEncryption(
  encryptedPayload: string,
  keyRing: KeyRing,
  targetVersion: string,
): string {
  const plainText = decryptToken(encryptedPayload, keyRing);
  return encryptTokenVersioned(plainText, keyRing, targetVersion);
}
