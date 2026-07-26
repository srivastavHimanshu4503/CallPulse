import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Analytics } from "@vercel/analytics/react";
import { HomePage } from "./pages/HomePage";

// Homepage loads eagerly (highest-traffic route). Vertical/City/Sitemap
// pages are code-split so their bundles only ship when the user hits
// them — keeps the /  entry point lean.
const VerticalPage = lazy(() => import("./pages/VerticalPage").then((m) => ({ default: m.VerticalPage })));
const CityPage = lazy(() => import("./pages/CityPage").then((m) => ({ default: m.CityPage })));
const SitemapPage = lazy(() => import("./pages/SitemapPage").then((m) => ({ default: m.SitemapPage })));

function RouteFallback() {
  return <div className="min-h-screen bg-bg-canvas" aria-hidden />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/for/:vertical" element={<VerticalPage />} />
          <Route path="/city/:city" element={<CityPage />} />
          <Route path="/sitemap" element={<SitemapPage />} />
        </Routes>
      </Suspense>
      <Analytics />
    </BrowserRouter>
  );
}
