import path from "node:path";
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
import Prerenderer from "@prerenderer/prerenderer";
import PuppeteerRenderer from "@prerenderer/renderer-puppeteer";

// Keep in sync with src/data/verticals.ts and src/data/cities.ts. Duplicated
// here (rather than imported) because Node runs this .mjs script directly
// and can't parse TS. If you add a vertical or city, add its slug here.
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

// Post-build prerender: walks the built SPA in a headless browser, snapshots
// the fully hydrated DOM, and writes the static markup back into each
// route's index.html. Crawlers (Bing, DuckDuckGo, ChatGPT search, WhatsApp,
// LinkedIn) see the full page; hydration on real browsers is a no-op.
//
// Chrome resolution order:
//   1. $PUPPETEER_EXECUTABLE_PATH (explicit override)
//   2. macOS: system Chrome (fast local dev, avoids downloading chromium)
//   3. Linux (Vercel): @sparticuz/chromium — a self-contained chromium
//      binary that bundles the shared libs Amazon Linux is missing
//      (libnspr4, libatk, libcups, etc.). puppeteer's own bundled chromium
//      does NOT work on Vercel because those libs aren't installed.
//   4. Fallback: puppeteer's bundled chromium (works on desktop Linux).

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, "..", "dist");

const ROUTES = [
  "/",
  ...VERTICAL_SLUGS.map((s) => `/for/${s}`),
  ...CITY_SLUGS.map((s) => `/city/${s}`),
  "/sitemap",
];

async function resolveChrome() {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    return { executablePath: process.env.PUPPETEER_EXECUTABLE_PATH, extraArgs: [] };
  }
  if (process.platform === "darwin") {
    const macChrome =
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
    try {
      await fs.access(macChrome);
      return { executablePath: macChrome, extraArgs: [] };
    } catch {
      // fall through
    }
  }
  if (process.platform === "linux") {
    // @sparticuz/chromium ships a chromium that includes its own shared libs,
    // so it works on serverless Linux (Vercel, AWS Lambda) where libnspr4 &
    // friends aren't installed system-wide.
    try {
      const { default: chromium } = await import("@sparticuz/chromium");
      const executablePath = await chromium.executablePath();
      return { executablePath, extraArgs: chromium.args };
    } catch (err) {
      console.warn("@sparticuz/chromium unavailable, falling back to puppeteer bundle:", err.message);
    }
  }
  return { executablePath: undefined, extraArgs: [] };
}

async function main() {
  await fs.access(distDir).catch(() => {
    throw new Error(`dist not found at ${distDir} — run 'vite build' first.`);
  });

  const { executablePath, extraArgs } = await resolveChrome();
  const launchOptions = {
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      ...extraArgs,
    ],
  };
  if (executablePath) {
    launchOptions.executablePath = executablePath;
  }

  const rendererOpts = {
    renderAfterTime: 3500,
    launchOptions,
  };

  const prerenderer = new Prerenderer({
    staticDir: distDir,
    renderer: new PuppeteerRenderer(rendererOpts),
  });

  await prerenderer.initialize();

  try {
    const rendered = await prerenderer.renderRoutes(ROUTES);
    for (const { route, html } of rendered) {
      const outDir = path.join(distDir, route);
      await fs.mkdir(outDir, { recursive: true });
      const outFile = path.join(outDir, "index.html");
      await fs.writeFile(outFile, html);
      console.log(`prerendered ${route} → ${path.relative(distDir, outFile)}`);
    }
  } finally {
    await prerenderer.destroy();
  }
}

main().catch((err) => {
  console.error("prerender failed:", err);
  process.exit(1);
});
