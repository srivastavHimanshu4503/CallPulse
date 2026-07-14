import * as React from "react";
import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Users, Workflow, Settings, LogOut, Bot, Menu, Bell, BarChart3 } from "lucide-react";
import { useAuthStore } from "../../stores/auth.store.js";
import { useUIStore } from "../../stores/ui.store.js";
import { Logo } from "../common/Logo.js";
import { toast } from "sonner";

export function Sidebar(): React.JSX.Element {
  const location = useLocation();
  const logout = useAuthStore((state) => state.logout);
  const sidebarMinimized = useUIStore((state) => state.sidebarMinimized);
  const toggleSidebar = useUIStore((state) => state.toggleSidebar);

  const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "CRM", href: "/crm", icon: Users },
    { name: "Outbound Workflows", href: "/workflows", icon: Workflow },
    { name: "Notifications", href: "/notifications", icon: Bell },
    { name: "Analytics", href: "/analytics", icon: BarChart3 },
    { name: "Agents", href: "/agents", icon: Bot },
    { name: "Settings", href: "/settings", icon: Settings },
  ];

  return (
    <aside className={`fixed inset-y-0 left-0 z-20 flex flex-col border-r border-[#E5E5E5] bg-white text-[#111111] transition-all duration-200 select-none ${sidebarMinimized ? "w-[64px]" : "w-[240px]"}`}>
      
      {/* Brand area */}
      <div className={`flex h-14 items-center ${sidebarMinimized ? "justify-center" : "justify-between"} px-4 border-b border-[#E5E5E5] bg-white transition-all`}>
        {!sidebarMinimized && (
          <Logo height={56} />
        )}
        {sidebarMinimized && (
          <Logo variant="mark" height={56} />
        )}
        
        <button
          type="button"
          onClick={toggleSidebar}
          className="text-[#666666] hover:text-[#111111] p-1.5 rounded-[6px] hover:bg-[#F7F7F7] focus:outline-none transition-colors ml-1"
          title={sidebarMinimized ? "Expand Sidebar" : "Minimize Sidebar"}
        >
          <Menu className="h-4.5 w-4.5" />
        </button>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 space-y-1 px-2.5 py-4 overflow-y-auto custom-scrollbar">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              to={item.href}
              className={`flex items-center ${sidebarMinimized ? "justify-center" : "gap-3"} rounded-[6px] px-3 py-2 text-xs font-medium transition-all ${
                isActive
                  ? "bg-[#EFF6FF] text-[#2563EB]"
                  : "text-[#666666] hover:bg-[#F7F7F7] hover:text-[#111111]"
              }`}
              title={sidebarMinimized ? item.name : undefined}
            >
              <Icon className={`h-4.5 w-4.5 shrink-0 ${isActive ? "text-[#2563EB]" : "text-[#999999]"}`} />
              {!sidebarMinimized && <span>{item.name}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Dynamic Credit & Usage Telemetry Section */}
      <div className="border-t border-[#E5E5E5] p-4 bg-white flex flex-col justify-center select-none shrink-0">
        {sidebarMinimized ? (
          <button
            type="button"
            onClick={() => toast.info("Workspace Usage: 4,850 mins remaining of 5,000 mins. Business Pro Plan.")}
            className="flex h-10 w-10 items-center justify-center rounded-[6px] border border-[#2563EB]/15 bg-[#EFF6FF] text-[#2563EB] font-bold text-xs hover:bg-[#2563EB]/10 transition-colors relative"
            title="Usage: 97% available"
          >
            <span>⚡</span>
            <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-[#16A34A] animate-ping" />
          </button>
        ) : (
          <div className="space-y-3">
            {/* Plan Header */}
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-[#111111] uppercase tracking-wider">Business Pro Plan</span>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-bold bg-[#F0FDF4] border border-[#16A34A]/25 text-[#16A34A] uppercase tracking-wide">
                Active
              </span>
            </div>

            {/* Quota Usage and Progress Bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-[11px] font-semibold text-[#666666]">
                <span>Voice Quota Usage</span>
                <span className="text-[#111111] font-bold">4,850 / 5,000 min</span>
              </div>
              
              {/* Premium Progress Bar */}
              <div className="h-1.5 w-full bg-[#F3F4F6] rounded-full overflow-hidden border border-[#E5E5E5]/45">
                <div 
                  className="h-full bg-gradient-to-r from-[#2563EB] to-[#3B82F6] rounded-full transition-all duration-500" 
                  style={{ width: "97%" }} 
                />
              </div>
              
              <div className="flex justify-between text-[9px] text-[#999999] font-bold tracking-wide uppercase">
                <span>97% Available</span>
                <span>Renews in 12 days</span>
              </div>
            </div>

            {/* Quota Action Controls */}
            <button
              type="button"
              onClick={() => toast.warning("Low balance! Billing portal is out of scope for MVP - coming soon!")}
              className="w-full h-8 bg-white hover:bg-[#F9FAFB] border border-[#E5E5E5] text-[#111111] hover:text-[#2563EB] rounded-[6px] text-[10px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
            >
              <span>💳</span> Manage Billing
            </button>
          </div>
        )}
      </div>

      {/* Logout Footer Section */}
      <div className="border-t border-[#E5E5E5] p-3 bg-white flex justify-center">
        <button
          onClick={logout}
          className={`flex items-center ${sidebarMinimized ? "justify-center w-10 h-10 px-0" : "w-full px-3.5 py-2"} rounded-[6px] border border-[#DC2626] bg-white text-xs font-medium text-[#DC2626] hover:bg-[#DC2626]/5 transition-colors h-10`}
          title="Logout"
        >
          <LogOut className="h-4.5 w-4.5 text-[#DC2626] shrink-0" />
          {!sidebarMinimized && <span className="ml-3">Logout</span>}
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
