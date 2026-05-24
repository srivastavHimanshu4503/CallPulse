import * as React from "react";
import { Sidebar } from "./Sidebar.js";
import { Topbar } from "./Topbar.js";

interface PageWrapperProps {
  children: React.ReactNode;
}

export function PageWrapper({ children }: PageWrapperProps): React.JSX.Element {
  return (
    <div className="min-h-screen bg-background-dark dark:bg-background-light transition-colors duration-200">
      {/* Structural Layout Side Navigation */}
      <Sidebar />

      {/* Main Container */}
      <div className="pl-sidebar flex flex-col min-h-screen">
        {/* Top Header Navigation */}
        <Topbar />

        {/* Content Body Area */}
        <main className="flex-1 pt-16 px-8 py-8 animate-in fade-in slide-in-from-bottom-3 duration-300">
          {children}
        </main>
      </div>
    </div>
  );
}
export default PageWrapper;
