import test from "node:test";
import assert from "node:assert";
import { encryptToken, decryptToken } from "@antigravity/utils/crypto";

test("Can import crypto from utils via package export boundary", () => {
  const dummyKey = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
  const plaintext = "hello-world";

  const encrypted = encryptToken(plaintext, dummyKey);
  assert.ok(encrypted.includes(":")); // Ensure it format matches IV:AuthTag:Ciphertext

  const decrypted = decryptToken(encrypted, dummyKey);
  assert.strictEqual(decrypted, plaintext);
});
