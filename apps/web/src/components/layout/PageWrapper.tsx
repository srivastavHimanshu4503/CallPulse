import * as React from "react";
import { Sidebar } from "./Sidebar.js";
import { Topbar } from "./Topbar.js";

interface PageWrapperProps {
  children: React.ReactNode;
}

export function PageWrapper({ children }: PageWrapperProps): React.JSX.Element {
  return (
    <div className="min-h-screen bg-white text-[#111111] font-sans antialiased">
      {/* Structural Sidebar - uses #FAFAFA, border #E5E5E5, width 240px */}
      <Sidebar />

      {/* Main Container */}
      <div className="pl-[240px] flex flex-col min-h-screen bg-white">
        {/* Top Header Navigation - height 56px */}
        <Topbar />

        {/* Content Body Area - starts after Topbar */}
        <main className="flex-1 pt-[56px] px-8 py-8 animate-in fade-in duration-200">
          <div className="max-w-[1200px] mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
export default PageWrapper;
