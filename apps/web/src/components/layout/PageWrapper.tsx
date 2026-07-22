import * as React from "react";
import { Sidebar } from "./Sidebar.js";
import { useUIStore } from "../../stores/ui.store.js";

interface PageWrapperProps {
  children: React.ReactNode;
  noScroll?: boolean;
}

export function PageWrapper({ children, noScroll = false }: PageWrapperProps): React.JSX.Element {
  const sidebarMinimized = useUIStore((state) => state.sidebarMinimized);

  return (
    <div className="h-screen overflow-hidden bg-bg-canvas text-fg-primary font-sans antialiased">
      <Sidebar />

      <div
        className={`flex flex-col h-screen overflow-hidden bg-bg-canvas transition-all duration-200 ${
          sidebarMinimized ? "pl-[68px]" : "pl-[220px]"
        }`}
      >
        <main
          className={`flex-1 pt-5 px-6 pb-5 animate-in fade-in duration-200 flex flex-col ${
            noScroll ? "overflow-hidden" : "overflow-y-auto"
          }`}
        >
          <div className={`w-full h-full flex flex-col ${noScroll ? "overflow-hidden" : ""}`}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

export default PageWrapper;
