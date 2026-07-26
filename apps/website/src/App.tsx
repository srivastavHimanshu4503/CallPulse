import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Analytics } from "@vercel/analytics/react";
import { HomePage } from "./pages/HomePage";
import { VerticalPage } from "./pages/VerticalPage";
import { CityPage } from "./pages/CityPage";
import { SitemapPage } from "./pages/SitemapPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/for/:vertical" element={<VerticalPage />} />
        <Route path="/city/:city" element={<CityPage />} />
        <Route path="/sitemap" element={<SitemapPage />} />
      </Routes>
      <Analytics />
    </BrowserRouter>
  );
}
