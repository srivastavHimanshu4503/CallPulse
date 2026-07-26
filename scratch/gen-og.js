// One-shot generator for social/branding assets.
// Renders SVG source (below) into apps/website/public/{logo.png, og-image.png}
// via sharp. Not wired into the build — run manually when brand changes:
//   node scratch/gen-og.js
const path = require('path');
const fs = require('fs');
const sharp = require(path.resolve(__dirname, '..', 'node_modules', '.pnpm', 'sharp@0.34.5', 'node_modules', 'sharp'));

const PUBLIC = path.resolve(__dirname, '..', 'apps', 'website', 'public');

// 512x512 square brand logo — Google Organization schema, PWA install icon,
// anywhere a square avatar is expected. Matches the inline SVG favicon
// aesthetic in apps/website/index.html: blue rounded square, white "DB".
const logoSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#2563eb"/>
      <stop offset="1" stop-color="#1d4ed8"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="112" fill="url(#g)"/>
  <text x="256" y="358" font-family="Helvetica, Arial, sans-serif" font-size="272" font-weight="800" fill="white" text-anchor="middle" letter-spacing="-8">DB</text>
</svg>`;

// 1200x630 Open Graph card — Twitter / Facebook / LinkedIn / WhatsApp preview.
// Standard OG size; anything else gets awkwardly cropped by some platforms.
const ogSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#1e40af"/>
      <stop offset="1" stop-color="#2563eb"/>
    </linearGradient>
    <linearGradient id="mark" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#ffffff"/>
      <stop offset="1" stop-color="#dbeafe"/>
    </linearGradient>
  </defs>

  <rect width="1200" height="630" fill="url(#bg)"/>

  <circle cx="1050" cy="80" r="180" fill="#ffffff" opacity="0.06"/>
  <circle cx="150" cy="580" r="220" fill="#ffffff" opacity="0.05"/>

  <rect x="80" y="215" width="200" height="200" rx="44" fill="url(#mark)"/>
  <text x="180" y="355" font-family="Helvetica, Arial, sans-serif" font-size="108" font-weight="800" fill="#2563eb" text-anchor="middle" letter-spacing="-4">DB</text>

  <text x="330" y="285" font-family="Helvetica, Arial, sans-serif" font-size="88" font-weight="800" fill="white" letter-spacing="-3">DeskBuddy</text>
  <text x="330" y="345" font-family="Helvetica, Arial, sans-serif" font-size="34" font-weight="400" fill="#dbeafe">AI Phone Receptionist for Indian Businesses</text>
  <text x="330" y="415" font-family="Helvetica, Arial, sans-serif" font-size="28" font-weight="600" fill="#93c5fd">24/7 · Hindi &amp; English · Bookings + CRM on autopilot</text>

  <rect x="0" y="560" width="1200" height="70" fill="#0f172a" opacity="0.35"/>
  <text x="600" y="606" font-family="Helvetica, Arial, sans-serif" font-size="28" font-weight="600" fill="white" text-anchor="middle">www.deskbuddy.in</text>
</svg>`;

(async () => {
  await sharp(Buffer.from(logoSvg)).png({ compressionLevel: 9 }).toFile(path.join(PUBLIC, 'logo.png'));
  await sharp(Buffer.from(ogSvg)).png({ compressionLevel: 9 }).toFile(path.join(PUBLIC, 'og-image.png'));
  console.log('logo.png', fs.statSync(path.join(PUBLIC, 'logo.png')).size, 'bytes');
  console.log('og-image.png', fs.statSync(path.join(PUBLIC, 'og-image.png')).size, 'bytes');
})();
