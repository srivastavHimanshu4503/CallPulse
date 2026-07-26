import { useSeoMeta } from "../hooks/useSeoMeta";
import { Nav } from "../components/sections/Nav";
import { Footer } from "../components/sections/Footer";
import { VERTICALS } from "../data/verticals";
import { CITIES } from "../data/cities";

// Human + crawler-visible sitemap. Complements /sitemap.xml — gives
// Googlebot an extra crawl path with anchor text (which the XML sitemap
// lacks) and helps users navigate. All internal links open normal <a>
// tags so page rank flows correctly.
export function SitemapPage() {
  useSeoMeta({
    title: "Site Map — All Pages | DeskBuddy",
    description:
      "Every page on DeskBuddy — AI receptionist landing pages for salons, clinics, restaurants and 5 more industries across 12 Indian cities.",
    canonical: "https://www.deskbuddy.in/sitemap",
  });

  return (
    <div className="flex flex-col min-h-screen">
      <Nav />
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-16 sm:py-24">
        <h1 className="text-[32px] sm:text-[42px] font-extrabold tracking-tight text-fg-primary mb-3">
          Site Map
        </h1>
        <p className="text-fg-secondary text-[15px] leading-relaxed mb-12 max-w-2xl">
          Every page on DeskBuddy — pick your industry or your city to see how
          the AI receptionist works for you specifically.
        </p>

        <section className="mb-12">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.14em] text-fg-muted mb-4">
            Main
          </h2>
          <ul className="space-y-2 text-[15px]">
            <li>
              <a href="/" className="text-brand hover:underline">Home</a>
            </li>
            <li>
              <a href="/#how-it-works" className="text-brand hover:underline">How it works</a>
            </li>
            <li>
              <a href="/#features" className="text-brand hover:underline">Features</a>
            </li>
            <li>
              <a href="/#industries" className="text-brand hover:underline">Industries</a>
            </li>
            <li>
              <a href="/#pricing" className="text-brand hover:underline">Pricing</a>
            </li>
            <li>
              <a href="/#faq" className="text-brand hover:underline">FAQ</a>
            </li>
          </ul>
        </section>

        <section className="mb-12">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.14em] text-fg-muted mb-4">
            For your business
          </h2>
          <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-2 text-[15px]">
            {VERTICALS.map((v) => (
              <li key={v.slug}>
                <a
                  href={`/for/${v.slug}`}
                  className="text-brand hover:underline"
                >
                  AI receptionist for {v.name}
                </a>
              </li>
            ))}
          </ul>
        </section>

        <section className="mb-12">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.14em] text-fg-muted mb-4">
            By city
          </h2>
          <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-2 text-[15px]">
            {CITIES.map((c) => (
              <li key={c.slug}>
                <a
                  href={`/city/${c.slug}`}
                  className="text-brand hover:underline"
                >
                  AI receptionist in {c.name}
                </a>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="text-[11px] font-bold uppercase tracking-[0.14em] text-fg-muted mb-4">
            Product
          </h2>
          <ul className="space-y-2 text-[15px]">
            <li>
              <a
                href="https://app.deskbuddy.in/login"
                className="text-brand hover:underline"
              >
                Log in
              </a>
            </li>
            <li>
              <a
                href="https://app.deskbuddy.in/register"
                className="text-brand hover:underline"
              >
                Get started free
              </a>
            </li>
            <li>
              <a
                href="mailto:hello@deskbuddy.in"
                className="text-brand hover:underline"
              >
                Contact
              </a>
            </li>
          </ul>
        </section>
      </main>
      <Footer />
    </div>
  );
}
