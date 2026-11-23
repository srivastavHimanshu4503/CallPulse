import test from "node:test";
import assert from "node:assert/strict";
import {
  getRecordingConsentDisclaimer,
  formatCallInceptionGreeting,
  redactIndianPII,
  DPDP_CONSENT_DISCLOSURES,
} from "./consent.js";

test("DPDP Consent — provides statutory disclaimers across all supported regional languages", () => {
  assert.equal(
    getRecordingConsentDisclaimer("english"),
    "This call is recorded for quality and appointment booking purposes.",
  );
  assert.equal(
    getRecordingConsentDisclaimer("hindi"),
    "यह कॉल गुणवत्ता और अपॉइंटमेंट बुकिंग के उद्देश्य से रिकॉर्ड की जा रही है।",
  );
  assert.equal(
    getRecordingConsentDisclaimer("hinglish"),
    "Yeh call quality aur appointment booking ke purpose se record ki ja rahi hai.",
  );
  assert.ok(DPDP_CONSENT_DISCLOSURES.marathi);
  assert.ok(DPDP_CONSENT_DISCLOSURES.tamil);
  assert.ok(DPDP_CONSENT_DISCLOSURES.telugu);
});

test("formatCallInceptionGreeting — prepends statutory disclosure when consentRequired is true", () => {
  const greeting = "Namaste! Welcome to Apollo Clinic. How may I help you today?";
  const result = formatCallInceptionGreeting(greeting, "english", true);

  assert.ok(
    result.startsWith("This call is recorded for quality and appointment booking purposes."),
  );
  assert.ok(result.endsWith("How may I help you today?"));
});

test("formatCallInceptionGreeting — bypasses disclosure when consentRequired is false", () => {
  const greeting = "Namaste! Welcome to Apollo Clinic.";
  const result = formatCallInceptionGreeting(greeting, "english", false);

  assert.equal(result, "Namaste! Welcome to Apollo Clinic.");
});

test("redactIndianPII — redacts Aadhaar, PAN, and Credit Card numbers from transcripts", () => {
  const sampleTranscript =
    "My name is Amit Patel, my Aadhaar is 5489 1234 5678, my PAN card is ABCDE1234F, and payment card is 4111-2222-3333-4444. Please book the slot.";

  const redacted = redactIndianPII(sampleTranscript);

  assert.ok(!redacted.includes("5489 1234 5678"), "Aadhaar must not be present in plaintext");
  assert.ok(!redacted.includes("ABCDE1234F"), "PAN must not be present in plaintext");
  assert.ok(!redacted.includes("4111-2222-3333-4444"), "Card number must not be present");

  assert.ok(redacted.includes("[REDACTED_AADHAAR]"), "Should insert Aadhaar redaction placeholder");
  assert.ok(redacted.includes("[REDACTED_PAN]"), "Should insert PAN redaction placeholder");
  assert.ok(redacted.includes("[REDACTED_CARD]"), "Should insert Card redaction placeholder");
  assert.ok(redacted.includes("Please book the slot."), "Should preserve conversational text");
});
