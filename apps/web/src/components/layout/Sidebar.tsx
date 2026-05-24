import * as React from "react";
import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Users, PhoneCall, Workflow, Settings, LogOut } from "lucide-react";
import { useAuth } from "../../hooks/useAuth.js";
import { useTenantStore } from "../../stores/tenant.store.js";

export function Sidebar(): React.JSX.Element {
  const location = useLocation();
  const { logout } = useAuth();
  const tenantName = useTenantStore((state) => state.tenantName) || "Indian SMB";

  const navigation = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Contacts", href: "/contacts", icon: Users },
    { name: "Communication", href: "/comms", icon: PhoneCall },
    { name: "Workflows", href: "/workflows", icon: Workflow },
    { name: "Settings", href: "/settings", icon: Settings },
  ];

  return (
    <aside className="fixed inset-y-0 left-0 z-20 flex w-sidebar flex-col border-r border-border-dark dark:border-border-light bg-surface-dark dark:bg-surface-light text-text-dark dark:text-text-light transition-all">
      {/* Brand area */}
      <div className="flex h-16 items-center justify-between px-6 border-b border-border-dark dark:border-border-light bg-black bg-opacity-20">
        <Link to="/" className="flex items-center gap-2 font-bold text-lg tracking-wide text-primary">
          <span className="text-2xl">🌀</span>
          <span>Antigravity</span>
        </Link>
      </div>

      {/* Tenant Context Indicator */}
      <div className="px-6 py-4 border-b border-border-dark dark:border-border-light bg-primary bg-opacity-5">
        <div className="text-xs text-muted font-medium uppercase tracking-wider">Active Tenant</div>
        <div className="text-sm font-semibold truncate text-primary">{tenantName}</div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 space-y-1.5 px-4 py-6">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              to={item.href}
              className={`flex items-center gap-3.5 rounded-lg px-4 py-3 text-sm font-medium transition-all duration-200 group ${
                isActive
                  ? "bg-primary text-white shadow-lg shadow-primary/20 scale-[1.02]"
                  : "text-muted hover:bg-surface-dark dark:hover:bg-surface-light hover:text-text-dark dark:hover:text-text-light"
              }`}
            >
              <Icon className={`h-5 w-5 transition-transform duration-200 group-hover:scale-110 ${isActive ? "text-white" : "text-muted"}`} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Logout Footer Section */}
      <div className="border-t border-border-dark dark:border-border-light p-4">
        <button
          onClick={logout}
          className="flex w-full items-center gap-3.5 rounded-lg px-4 py-3 text-sm font-medium text-error hover:bg-error hover:bg-opacity-10 transition-colors"
        >
          <LogOut className="h-5 w-5" />
          Logout
        </button>
      </div>
    </aside>
  );
}
export default Sidebar;
