import * as React from "react";
import { Bell, Search, User } from "lucide-react";
import { useAuthStore } from "../../stores/auth.store.js";

export function Topbar(): React.JSX.Element {
  const user = useAuthStore((state) => state.user);
  
  const userName = user?.name || "Workspace Owner";
  const userRole = user?.role || "OWNER";

  return (
    <header className="fixed top-0 right-0 left-[240px] z-10 flex h-14 items-center justify-between border-b border-[#E5E5E5] bg-white px-8 select-none">
      
      {/* Search Input Placeholder */}
      <div className="flex w-96 items-center gap-2.5 rounded-[6px] border border-[#E5E5E5] bg-white px-3 py-1.5 focus-within:border-[#2563EB] transition-colors">
        <Search className="h-4 w-4 text-[#999999]" />
        <input
          type="text"
          placeholder="Quick search... (Press '/' to focus)"
          className="w-full bg-transparent text-xs text-[#111111] placeholder-[#999999] focus:outline-none"
          disabled
        />
      </div>

      {/* Action / Profile items */}
      <div className="flex items-center gap-5">
        {/* Notifications Icon */}
        <button className="relative rounded-[6px] p-1.5 text-[#666666] hover:bg-[#F7F7F7] hover:text-[#111111] transition-colors focus:outline-none">
          <Bell className="h-4.5 w-4.5" />
          <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-[#2563EB]" />
        </button>

        {/* User Profile Block */}
        <div className="flex items-center gap-3 border-l border-[#E5E5E5] pl-5">
          <div className="text-right">
            <div className="text-xs font-semibold text-[#111111]">{userName}</div>
            <div className="text-[10px] text-[#666666] font-medium uppercase tracking-wider mt-0.5">{userRole.toLowerCase()}</div>
          </div>
          <div className="flex h-8 w-8 items-center justify-center rounded-[6px] bg-[#F7F7F7] border border-[#E5E5E5] text-[#111111]">
            <User className="h-4 w-4" />
          </div>
        </div>
      </div>
    </header>
  );
}
export default Topbar;
