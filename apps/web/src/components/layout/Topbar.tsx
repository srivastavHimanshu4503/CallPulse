import * as React from "react";
import { Bell, Search, User } from "lucide-react";
import { useAuth } from "../../hooks/useAuth.js";

export function Topbar(): React.JSX.Element {
  const { user } = useAuth();
  const userName = user?.name || "SMB Owner";
  const userRole = user?.role || "Administrator";

  return (
    <header className="fixed top-0 right-0 left-sidebar z-10 flex h-16 items-center justify-between border-b border-border-dark dark:border-border-light bg-surface-dark bg-opacity-65 dark:bg-surface-light dark:bg-opacity-65 backdrop-blur-md px-8">
      {/* Search Input Placeholder */}
      <div className="flex w-96 items-center gap-2.5 rounded-lg border border-border-dark dark:border-border-light px-3 py-1.5 bg-black bg-opacity-10 dark:bg-white dark:bg-opacity-5">
        <Search className="h-4 w-4 text-muted" />
        <input
          type="text"
          placeholder="Search contacts, calls or deals (Press '/' to search)..."
          className="w-full bg-transparent text-sm text-text-dark dark:text-text-light placeholder:text-muted focus:outline-none"
          disabled
        />
      </div>

      {/* Action / Profile items */}
      <div className="flex items-center gap-6">
        {/* Notifications Icon */}
        <button className="relative rounded-lg p-2 text-muted hover:bg-surface-dark dark:hover:bg-surface-light hover:text-text-dark dark:hover:text-text-light transition-colors">
          <Bell className="h-5 w-5" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary" />
        </button>

        {/* User Profile Block */}
        <div className="flex items-center gap-3 border-l border-border-dark dark:border-border-light pl-6">
          <div className="text-right">
            <div className="text-sm font-semibold text-text-dark dark:text-text-light">{userName}</div>
            <div className="text-xs text-muted font-medium capitalize">{userRole.toLowerCase()}</div>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary bg-opacity-10 border border-primary border-opacity-20 text-primary">
            <User className="h-5 w-5" />
          </div>
        </div>
      </div>
    </header>
  );
}
export default Topbar;
