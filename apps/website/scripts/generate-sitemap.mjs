import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Generates dist/sitemap.xml from the same slug lists the prerender script
// uses. lastmod is set to build time so Google sees a fresh signal every
// deploy — this is the recommended way to nudge Googlebot to recrawl.

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, "..", "dist");

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

const HOST = "https://www.deskbuddy.in";

function urlEntry(loc, { priority, changefreq, lastmod }) {
  return `  <url>
    <loc>${loc}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
}

async function main() {
  await fs.access(distDir).catch(() => {
    throw new Error(`dist not found at ${distDir} — run 'vite build' first.`);
  });

  const lastmod = new Date().toISOString();

  const entries = [];

  entries.push(urlEntry(`${HOST}/`, { priority: "1.0", changefreq: "weekly", lastmod }));

  for (const slug of VERTICAL_SLUGS) {
    entries.push(
      urlEntry(`${HOST}/for/${slug}`, {
        priority: "0.9",
        changefreq: "monthly",
        lastmod,
      }),
    );
  }

  for (const slug of CITY_SLUGS) {
    entries.push(
      urlEntry(`${HOST}/city/${slug}`, {
        priority: "0.8",
        changefreq: "monthly",
        lastmod,
      }),
    );
  }

  entries.push(
    urlEntry(`${HOST}/sitemap`, {
      priority: "0.5",
      changefreq: "weekly",
      lastmod,
    }),
  );

  const sectionAnchors = ["how-it-works", "features", "industries", "pricing", "faq"];
  for (const anchor of sectionAnchors) {
    entries.push(
      urlEntry(`${HOST}/#${anchor}`, {
        priority: anchor === "pricing" ? "0.7" : "0.6",
        changefreq: "monthly",
        lastmod,
      }),
    );
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join("\n")}
</urlset>
`;

  const outPath = path.join(distDir, "sitemap.xml");
  await fs.writeFile(outPath, xml, "utf8");
  console.log(`sitemap → dist/sitemap.xml (${entries.length} URLs, lastmod=${lastmod})`);
}

main().catch((err) => {
  console.error("sitemap generation failed:", err);
  process.exit(1);
});
