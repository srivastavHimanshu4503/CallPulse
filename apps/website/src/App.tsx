import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Analytics } from "@vercel/analytics/react";
import { HomePage } from "./pages/HomePage";
import { VerticalPage } from "./pages/VerticalPage";
import { CityPage } from "./pages/CityPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/for/:vertical" element={<VerticalPage />} />
        <Route path="/city/:city" element={<CityPage />} />
      </Routes>
      <Analytics />
    </BrowserRouter>
  );
}
