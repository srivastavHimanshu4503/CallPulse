import * as React from "react";
import { Bell } from "lucide-react";
import { useUIStore } from "../../stores/ui.store.js";
import { toast } from "sonner";

export function Topbar(): React.JSX.Element {
  const sidebarMinimized = useUIStore((state) => state.sidebarMinimized);

  return (
    <header
      className={`fixed top-0 right-0 z-10 flex h-14 items-center justify-end border-b border-[#E5E5E5] bg-white/80 backdrop-blur px-6 select-none transition-all duration-200 ${
        sidebarMinimized ? "left-[76px]" : "left-[264px]"
      }`}
    >
      <button
        type="button"
        onClick={() => toast.info("Notifications coming soon.")}
        className="relative rounded-lg p-2 text-[#666666] hover:bg-[#F7F7F7] hover:text-[#111111] transition-colors focus:outline-none"
        title="Notifications"
      >
        <Bell className="h-[18px] w-[18px]" />
        <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-[#F97316]" />
      </button>
    </header>
  );
}

export default Topbar;
