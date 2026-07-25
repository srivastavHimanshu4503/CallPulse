import * as React from "react";
import { Menu } from "lucide-react";
import { Sidebar } from "./Sidebar.js";
import { Logo } from "../common/Logo.js";
import { useUIStore } from "../../stores/ui.store.js";

interface PageWrapperProps {
  children: React.ReactNode;
  noScroll?: boolean;
}

export function PageWrapper({ children, noScroll = false }: PageWrapperProps): React.JSX.Element {
  const sidebarMinimized = useUIStore((state) => state.sidebarMinimized);
  const setMobileSidebarOpen = useUIStore((state) => state.setMobileSidebarOpen);

  const desktopPaddingClass = sidebarMinimized ? "lg:pl-[68px]" : "lg:pl-[220px]";

  return (
    <div className="h-screen overflow-hidden bg-bg-canvas text-fg-primary font-sans antialiased">
      <Sidebar />

      {/* Mobile top bar — hamburger + brand. Hidden on ≥lg. */}
      <header className="lg:hidden fixed top-0 inset-x-0 z-20 h-14 flex items-center justify-between px-4 border-b border-line-subtle bg-bg-raised/95 backdrop-blur">
        <button
          type="button"
          onClick={() => setMobileSidebarOpen(true)}
          className="p-2 -ml-2 rounded-md text-fg-primary hover:bg-bg-muted transition-colors"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <Logo height={28} />
        <div className="w-9" />
      </header>

      <div
        className={`flex flex-col h-screen overflow-hidden bg-bg-canvas transition-all duration-200 pt-14 lg:pt-0 ${desktopPaddingClass}`}
      >
        <main
          className={`flex-1 pt-4 lg:pt-5 px-4 sm:px-5 lg:px-6 pb-5 animate-in fade-in duration-200 flex flex-col overflow-y-auto ${
            noScroll ? "lg:overflow-hidden" : ""
          }`}
        >
          <div className={`w-full flex flex-col lg:h-full ${noScroll ? "lg:overflow-hidden" : ""}`}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

export default PageWrapper;
