import * as React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Workflow,
  Settings,
  LogOut,
  Bot,
  PanelLeftClose,
  PanelLeftOpen,
  Bell,
  BarChart3,
  ChevronUp,
  Zap,
  CreditCard,
  Code2,
} from "lucide-react";
import { useAuthStore } from "../../stores/auth.store.js";
import { useUIStore } from "../../stores/ui.store.js";
import { Logo } from "../common/Logo.js";
import { toast } from "sonner";

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV: NavItem[] = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Agents", href: "/agents", icon: Bot },
  { name: "CRM", href: "/crm", icon: Users },
  { name: "Workflows", href: "/workflows", icon: Workflow },
  { name: "Widget", href: "/widget", icon: Code2 },
  { name: "Analytics", href: "/analytics", icon: BarChart3 },
  { name: "Notifications", href: "/notifications", icon: Bell },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar(): React.JSX.Element {
  const location = useLocation();
  const logout = useAuthStore((state) => state.logout);
  const user = useAuthStore((state) => state.user);
  const sidebarMinimized = useUIStore((state) => state.sidebarMinimized);
  const toggleSidebar = useUIStore((state) => state.toggleSidebar);

  const [profileOpen, setProfileOpen] = React.useState(false);
  const profileRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (!profileOpen) return;
    const onDown = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [profileOpen]);

  const userName = user?.name || "Workspace Owner";
  const userEmail = user?.email || "";
  const userRole = user?.role || "OWNER";
  const initial = userName.trim().charAt(0).toUpperCase() || "I";

  const renderNavItem = (item: NavItem) => {
    const isActive =
      location.pathname === item.href ||
      (item.href !== "/" && location.pathname.startsWith(item.href + "/"));
    const Icon = item.icon;

    return (
      <Link
        key={item.name}
        to={item.href}
        className={[
          "group relative flex items-center rounded-lg transition-all",
          sidebarMinimized
            ? "h-10 w-10 mx-auto justify-center"
            : "gap-3 px-3 h-9",
          isActive
            ? "bg-active-nav text-active-navText shadow-sm font-semibold"
            : "text-fg-secondary hover:bg-bg-muted hover:text-fg-primary",
        ].join(" ")}
        title={sidebarMinimized ? item.name : undefined}
      >
        <Icon
          className={[
            "h-[17px] w-[17px] shrink-0",
            isActive ? "text-active-navText" : "text-fg-muted group-hover:text-fg-secondary",
          ].join(" ")}
        />
        {!sidebarMinimized && (
          <span className="text-[13px] font-medium tracking-tight">{item.name}</span>
        )}
      </Link>
    );
  };

  return (
    <aside
      className={[
        "fixed inset-y-0 left-0 z-20 flex flex-col border-r border-line-default bg-white text-fg-primary transition-all duration-200 select-none",
        sidebarMinimized ? "w-[68px]" : "w-[220px]",
      ].join(" ")}
    >
      {/* Brand */}
      <div
        className={[
          "flex h-14 items-center border-b border-line-subtle px-3 shrink-0",
          sidebarMinimized ? "justify-center" : "justify-between",
        ].join(" ")}
      >
        {sidebarMinimized ? <Logo variant="mark" height={30} /> : <Logo height={38} />}
        {!sidebarMinimized && (
          <button
            type="button"
            onClick={toggleSidebar}
            className="text-fg-muted hover:text-fg-primary p-1.5 rounded-md hover:bg-bg-muted transition-colors"
            title="Minimize sidebar"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        )}
      </div>

      {sidebarMinimized && (
        <button
          type="button"
          onClick={toggleSidebar}
          className="mx-auto mt-1 text-fg-muted hover:text-fg-primary p-1.5 rounded-md hover:bg-bg-muted transition-colors"
          title="Expand sidebar"
        >
          <PanelLeftOpen className="h-4 w-4" />
        </button>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-2.5 py-3 overflow-y-auto">
        <div className="space-y-0.5">{NAV.map(renderNavItem)}</div>
      </nav>

      {/* Billing / Usage — minimal card */}
      <div className="border-t border-line-subtle p-3 shrink-0">
        {sidebarMinimized ? (
          <button
            type="button"
            onClick={() =>
              toast.info("Workspace usage: 4,850 of 5,000 credits remaining · Business Pro plan.")
            }
            className="mx-auto flex h-10 w-10 items-center justify-center rounded-md transition-all border border-line-default bg-white text-fg-primary hover:bg-bg-muted"
            title="Business Pro · 97% available"
          >
            <Zap className="h-[17px] w-[17px]" />
          </button>
        ) : (
          <div className="relative rounded-xl p-3 border border-line-default bg-white">
            <div className="relative">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-fg-primary">
                  Business Pro
                </span>
                <span
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide bg-success-50 text-success-600 border border-success-200/50"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-success-500" />
                  Active
                </span>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-[11px] font-medium">
                  <span className="text-fg-secondary">Credits</span>
                  <span className="font-semibold text-fg-primary">
                    4,850 / 5,000
                  </span>
                </div>
                <div className="h-2 w-full rounded-full overflow-hidden bg-line-subtle">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: "97%" }}
                  />
                </div>
                <div className="flex justify-between text-[9.5px] font-semibold tracking-wide uppercase text-fg-muted">
                  <span>97% available</span>
                  <span>12d renewal</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => toast.warning("Billing portal coming soon.")}
                className="w-full h-8 mt-2.5 rounded-md text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 bg-white border border-line-default text-fg-primary hover:bg-bg-muted"
              >
                <CreditCard className="h-3.5 w-3.5" />
                Manage billing
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Profile + Logout — bottom popover */}
      <div className="relative border-t border-line-subtle px-2 py-3 mb-2 shrink-0" ref={profileRef}>
        <button
          type="button"
          onClick={() => setProfileOpen((v) => !v)}
          className={[
            "w-full flex items-center rounded-lg hover:bg-bg-muted transition-all py-1.5",
            sidebarMinimized ? "justify-center" : "justify-between gap-2 px-2",
          ].join(" ")}
          title={sidebarMinimized ? userName : undefined}
        >
          <div className={sidebarMinimized ? "" : "flex items-center gap-2.5 min-w-0"}>
            {(user as any)?.avatarUrl ? (
              <img src={(user as any).avatarUrl} alt={userName} className="h-8 w-8 rounded-full object-cover shrink-0" />
            ) : (
              <div className="h-8 w-8 rounded-full bg-primary text-white flex items-center justify-center text-[11.5px] font-semibold shrink-0">
                {initial}
              </div>
            )}
            {!sidebarMinimized && (
              <div className="min-w-0 text-left">
                <div className="text-[12.5px] font-semibold text-fg-primary truncate leading-tight">
                  {userName}
                </div>
                <div className="text-[10.5px] text-fg-muted truncate">{userEmail}</div>
              </div>
            )}
          </div>
          {!sidebarMinimized && (
            <ChevronUp
              className={[
                "h-4 w-4 text-fg-muted shrink-0 transition-transform",
                profileOpen ? "" : "rotate-180",
              ].join(" ")}
            />
          )}
        </button>

        {profileOpen && (
          <div
            className={[
              "absolute bottom-[calc(100%-6px)] mb-2 z-30",
              sidebarMinimized ? "left-[68px]" : "left-2 right-2",
            ].join(" ")}
          >
            <div
              className="rounded-lg border border-line-default bg-white shadow-pop overflow-hidden"
              style={{ minWidth: sidebarMinimized ? "240px" : undefined }}
            >
              <div className="px-3.5 py-3 border-b border-line-subtle flex items-center gap-3">
                {(user as any)?.avatarUrl ? (
                  <img src={(user as any).avatarUrl} alt={userName} className="h-10 w-10 rounded-full object-cover shrink-0" />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-primary text-white flex items-center justify-center text-[12.5px] font-semibold shrink-0">
                    {initial}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="text-[13px] font-semibold text-fg-primary truncate">{userName}</div>
                  <div className="text-[11px] text-fg-muted truncate">{userEmail}</div>
                  <div className="mt-1 inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-brand-50 border border-brand-500/20 text-brand-600 uppercase tracking-wide">
                    {userRole.toLowerCase()}
                  </div>
                </div>
              </div>
              <div className="p-1.5">
                <Link
                  to="/settings"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-md text-[12.5px] font-medium text-fg-secondary hover:bg-bg-muted hover:text-fg-primary transition-all"
                >
                  <Settings className="h-4 w-4 text-fg-muted" />
                  Account settings
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setProfileOpen(false);
                    logout();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-[12.5px] font-medium text-negative-500 hover:bg-negative-50 transition-all"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}

export default Sidebar;
