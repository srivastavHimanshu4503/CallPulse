import * as React from "react";
import { Sidebar } from "./Sidebar.js";
import { Topbar } from "./Topbar.js";
import { useUIStore } from "../../stores/ui.store.js";

interface PageWrapperProps {
  children: React.ReactNode;
  noScroll?: boolean;
}

export function PageWrapper({ children, noScroll = false }: PageWrapperProps): React.JSX.Element {
  const sidebarMinimized = useUIStore((state) => state.sidebarMinimized);

  return (
    <div className="h-screen overflow-hidden bg-white text-[#111111] font-sans antialiased">
      {/* Structural Sidebar */}
      <Sidebar />

      {/* Main Container */}
      <div className={`flex flex-col h-screen overflow-hidden bg-white transition-all duration-200 ${sidebarMinimized ? "pl-[64px]" : "pl-[240px]"}`}>
        {/* Top Header Navigation - height 56px */}
        <Topbar />

        {/* Content Body Area - starts after Topbar */}
        <main className={`flex-1 pt-[76px] px-8 pb-6 animate-in fade-in duration-200 flex flex-col ${noScroll ? "overflow-hidden" : "overflow-y-auto"}`}>
          <div className={`w-full h-full flex flex-col ${noScroll ? "overflow-hidden" : ""}`}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

export default PageWrapper;
