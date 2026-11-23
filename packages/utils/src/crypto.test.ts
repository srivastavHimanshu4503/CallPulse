import test from "node:test";
import assert from "node:assert";
import {
  encryptToken,
  decryptToken,
  encryptTokenVersioned,
  rotateTokenEncryption,
  type KeyRing,
} from "./crypto.js";
import { randomBytes } from "node:crypto";

test("A plaintext token can be encrypted", () => {
  const secretKey = randomBytes(32).toString("hex");
  const plainText = "test-oauth-token-12345";
  const encrypted = encryptToken(plainText, secretKey);
  assert.ok(encrypted);
  assert.ok(encrypted.includes(":"));
});

test("The ciphertext is not equal to the plaintext", () => {
  const secretKey = randomBytes(32).toString("hex");
  const plainText = "test-oauth-token-12345";
  const encrypted = encryptToken(plainText, secretKey);
  assert.notStrictEqual(encrypted, plainText);
  assert.ok(!encrypted.includes(plainText));
});

test("decryptToken(encryptToken(token, key), key) returns the exact original token", () => {
  const secretKey = randomBytes(32).toString("hex");
  const plainText = "test-oauth-token-12345";
  const encrypted = encryptToken(plainText, secretKey);
  const decrypted = decryptToken(encrypted, secretKey);
  assert.strictEqual(decrypted, plainText);
});

test("A corrupted ciphertext/authentication tag fails decryption", () => {
  const secretKey = randomBytes(32).toString("hex");
  const plainText = "test-oauth-token-12345";
  const encrypted = encryptToken(plainText, secretKey);
  const parts = encrypted.split(":");

  const corruptedTag = parts[0] + ":00000000000000000000000000000000:" + parts[2];
  assert.throws(() => {
    decryptToken(corruptedTag, secretKey);
  });

  const corruptedCiphertext = parts[0] + ":" + parts[1] + ":0000000000000000";
  assert.throws(() => {
    decryptToken(corruptedCiphertext, secretKey);
  });
});

test("A wrong encryption key fails decryption", () => {
  const secretKey = randomBytes(32).toString("hex");
  const plainText = "test-oauth-token-12345";
  const encrypted = encryptToken(plainText, secretKey);
  const wrongKey = randomBytes(32).toString("hex");

  assert.throws(() => {
    decryptToken(encrypted, wrongKey);
  });
});

test("The implementation does not return the plaintext as the encrypted payload", () => {
  const secretKey = randomBytes(32).toString("hex");
  const plainText = "test-oauth-token-12345";
  const encrypted = encryptToken(plainText, secretKey);
  const parts = encrypted.split(":");
  assert.notStrictEqual(parts[2], plainText);
});

test("Versioned token encryption outputs version header and decrypts correctly", () => {
  const keyRing: KeyRing = {
    v1: randomBytes(32).toString("hex"),
    v2: randomBytes(32).toString("hex"),
  };
  const plainText = "ya29.a0AfH6SMD-google-oauth-token-sample";

  const encryptedV1 = encryptTokenVersioned(plainText, keyRing, "v1");
  const partsV1 = encryptedV1.split(":");
  assert.equal(
    partsV1.length,
    4,
    "Versioned payload must have 4 parts (version:iv:tag:ciphertext)",
  );
  assert.equal(partsV1[0], "v1");
  assert.equal(decryptToken(encryptedV1, keyRing), plainText);

  const encryptedV2 = encryptTokenVersioned(plainText, keyRing, "v2");
  const partsV2 = encryptedV2.split(":");
  assert.equal(partsV2[0], "v2");
  assert.equal(decryptToken(encryptedV2, keyRing), plainText);
});

test("Key rotation — seamlessly rotates token from v1 to v2 without plaintext exposure", () => {
  const keyRing: KeyRing = {
    v1: randomBytes(32).toString("hex"),
    v2: randomBytes(32).toString("hex"),
  };
  const originalToken = "1//04test_refresh_token_xyz_rotated";

  // Step 1: Token encrypted under v1
  const v1Payload = encryptTokenVersioned(originalToken, keyRing, "v1");
  assert.ok(v1Payload.startsWith("v1:"));

  // Step 2: Zero-downtime key rotation to v2
  const v2Payload = rotateTokenEncryption(v1Payload, keyRing, "v2");
  assert.ok(v2Payload.startsWith("v2:"));
  assert.notEqual(v1Payload, v2Payload);

  // Step 3: Decrypted value matches original token
  const decrypted = decryptToken(v2Payload, keyRing);
  assert.equal(decrypted, originalToken);
});

test("Backwards compatibility — decryptToken transparently decrypts legacy 3-part unversioned tokens with KeyRing", () => {
  const v1Key = randomBytes(32).toString("hex");
  const legacyToken = "legacy-token-secret-data";
  const legacyEncrypted = encryptToken(legacyToken, v1Key); // 3-part format

  assert.equal(legacyEncrypted.split(":").length, 3);

  const keyRing: KeyRing = {
    v1: v1Key,
    v2: randomBytes(32).toString("hex"),
  };

  // Must decrypt transparently using v1 from KeyRing
  const decrypted = decryptToken(legacyEncrypted, keyRing);
  assert.equal(decrypted, legacyToken);
});
