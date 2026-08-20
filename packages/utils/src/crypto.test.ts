import test from "node:test";
import assert from "node:assert";
import { encryptToken, decryptToken } from "./crypto.js";
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
