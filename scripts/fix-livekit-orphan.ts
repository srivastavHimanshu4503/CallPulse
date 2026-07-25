// One-off: add an orphaned DID to LiveKit's inbound trunks + dispatch rule.
// Usage: pnpm --filter @antigravity/api tsx ../../scripts/fix-livekit-orphan.ts +918035613812
import { ensureNumberRouted } from "../apps/api/src/modules/telephony/livekit-sip.js";

async function main() {
  const number = process.argv[2];
  if (!number) {
    console.error("usage: fix-livekit-orphan.ts <E.164 number>");
    process.exit(1);
  }
  await ensureNumberRouted(number);
  console.log(`✓ ${number} is now routed on LiveKit`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
