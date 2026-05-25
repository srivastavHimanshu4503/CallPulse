import * as React from "react";
import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Users, PhoneCall, Workflow, Settings, LogOut, Bot, Sparkles } from "lucide-react";
import { useAuthStore } from "../../stores/auth.store.js";

export function Sidebar(): React.JSX.Element {
  const location = useLocation();
  const logout = useAuthStore((state) => state.logout);
  const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "CRM", href: "/crm", icon: Users },
    { name: "Communication", href: "/comms", icon: PhoneCall },
    { name: "Workflows", href: "/workflows", icon: Workflow },
    { name: "Agents", href: "/agents", icon: Bot },
    { name: "Settings", href: "/settings", icon: Settings },
  ];

  return (
    <aside className="fixed inset-y-0 left-0 z-20 flex w-[240px] flex-col border-r border-[#E5E5E5] bg-[#FAFAFA] text-[#111111] transition-all select-none">
      
      {/* Brand area */}
      <div className="flex h-14 items-center gap-3 px-6 border-b border-[#E5E5E5] bg-[#FAFAFA]">
        <div className="flex h-8 w-8 items-center justify-center rounded-[6px] bg-[#EFF6FF] border border-[#2563EB]/15 text-[#2563EB] shrink-0">
          <Sparkles className="h-4.5 w-4.5 text-[#2563EB]" />
        </div>
        <span className="font-bold text-sm tracking-tight text-[#111111] uppercase tracking-wider">
          IndiAI
        </span>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              to={item.href}
              className={`flex items-center gap-3 rounded-[6px] px-3.5 py-2 text-xs font-medium transition-all ${
                isActive
                  ? "bg-[#EFF6FF] text-[#2563EB]"
                  : "text-[#666666] hover:bg-[#F7F7F7] hover:text-[#111111]"
              }`}
            >
              <Icon className={`h-4.5 w-4.5 ${isActive ? "text-[#2563EB]" : "text-[#999999]"}`} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Logout Footer Section */}
      <div className="border-t border-[#E5E5E5] p-3 bg-white">
        <button
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-[6px] border border-[#DC2626] bg-white px-3.5 py-2 text-xs font-medium text-[#DC2626] hover:bg-[#DC2626]/5 transition-colors h-10"
        >
          <LogOut className="h-4.5 w-4.5 text-[#DC2626]" />
          Logout
        </button>
      </div>
    </aside>
  );
}
export default Sidebar;
