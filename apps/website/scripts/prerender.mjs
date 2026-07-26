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
//   1. $PUPPETEER_EXECUTABLE_PATH (explicit override, e.g. Vercel)
//   2. macOS system Chrome (fast local dev, avoids re-downloading chromium)
//   3. puppeteer's bundled chromium (default on Linux/Vercel builds — requires
//      `puppeteer` to be in root pnpm.onlyBuiltDependencies so postinstall runs)

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, "..", "dist");

const ROUTES = [
  "/",
  ...VERTICAL_SLUGS.map((s) => `/for/${s}`),
  ...CITY_SLUGS.map((s) => `/city/${s}`),
];

async function resolveChrome() {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    return process.env.PUPPETEER_EXECUTABLE_PATH;
  }
  if (process.platform === "darwin") {
    const macChrome =
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
    try {
      await fs.access(macChrome);
      return macChrome;
    } catch {
      // fall through to bundled chromium
    }
  }
  return undefined; // let puppeteer use its bundled chromium
}

async function main() {
  await fs.access(distDir).catch(() => {
    throw new Error(`dist not found at ${distDir} — run 'vite build' first.`);
  });

  const launchOptions = {
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  };
  const executablePath = await resolveChrome();
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
