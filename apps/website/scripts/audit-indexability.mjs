// Post-deploy indexability audit. Hits every URL that should be in Google's
// index and verifies:
//   1. HTTP 200
//   2. <link rel="canonical" href> matches the URL we requested
//   3. <meta name="robots"> permits indexing (index,follow)
//   4. A unique <title> tag is present
//
// Fails with exit code 1 if any URL breaks any of these. Run this after a
// deploy: `HOST=https://www.deskbuddy.in node scripts/audit-indexability.mjs`

const HOST = process.env.HOST || "https://www.deskbuddy.in";

const VERTICAL_SLUGS = [
  "salon",
  "clinic",
  "restaurant",
  "real-estate",
  "coaching",
  "gym",
  "automobile",
  "laundry",
];
const CITY_SLUGS = [
  "mumbai",
  "delhi",
  "bengaluru",
  "hyderabad",
  "chennai",
  "pune",
  "ahmedabad",
  "jaipur",
  "kolkata",
  "lucknow",
  "chandigarh",
  "kochi",
];

const URLS = [
  "/",
  ...VERTICAL_SLUGS.map((s) => `/for/${s}`),
  ...CITY_SLUGS.map((s) => `/city/${s}`),
  "/sitemap",
];

function extract(html, regex) {
  const m = html.match(regex);
  return m ? m[1] : null;
}

async function audit(path) {
  const url = `${HOST}${path}`;
  const fetchUrl = `${url}?_=${Date.now()}`; // bust CDN cache
  const errors = [];
  let title = "";
  try {
    const res = await fetch(fetchUrl, {
      redirect: "manual",
      headers: { "user-agent": "DeskBuddy-Audit/1.0 (Googlebot-check)" },
    });
    if (res.status !== 200) {
      errors.push(`HTTP ${res.status}`);
    }
    const html = await res.text();

    title = extract(html, /<title[^>]*>([^<]+)<\/title>/i) || "";
    if (!title) errors.push("missing <title>");

    const canonical = extract(
      html,
      /<link[^>]*rel="canonical"[^>]*href="([^"]+)"/i,
    );
    if (!canonical) {
      errors.push("missing canonical");
    } else if (canonical !== url) {
      errors.push(`canonical=${canonical} (expected ${url})`);
    }

    const robots = extract(html, /<meta[^>]*name="robots"[^>]*content="([^"]+)"/i);
    if (!robots) {
      errors.push("missing robots meta");
    } else if (/noindex|nofollow/i.test(robots)) {
      errors.push(`robots blocks indexing: "${robots}"`);
    }
  } catch (err) {
    errors.push(`fetch failed: ${err.message}`);
  }

  return { url, title, errors };
}

async function main() {
  console.log(`\nAuditing indexability at ${HOST}\n`);
  const results = await Promise.all(URLS.map((u) => audit(u)));

  const titles = new Map();
  for (const r of results) {
    if (r.title) titles.set(r.url, r.title);
  }
  const duplicateTitles = [];
  const seen = new Map();
  for (const [url, title] of titles) {
    if (seen.has(title)) {
      duplicateTitles.push({ title, urls: [seen.get(title), url] });
    } else {
      seen.set(title, url);
    }
  }

  let failed = 0;
  for (const r of results) {
    const marker = r.errors.length ? "❌" : "✅";
    console.log(`${marker} ${r.url}`);
    if (r.errors.length) {
      failed++;
      for (const e of r.errors) console.log(`     · ${e}`);
    }
  }

  if (duplicateTitles.length) {
    failed += duplicateTitles.length;
    console.log("\n❌ Duplicate <title> tags:");
    for (const d of duplicateTitles) {
      console.log(`   "${d.title}"`);
      for (const u of d.urls) console.log(`     · ${u}`);
    }
  }

  console.log(
    `\n${results.length - failed}/${results.length} URLs pass. ${failed} issue(s).`,
  );
  process.exit(failed ? 1 : 0);
}

main();
