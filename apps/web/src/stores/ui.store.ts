import { create } from "zustand";

interface UIState {
  sidebarMinimized: boolean;
  toggleSidebar: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarMinimized: localStorage.getItem("sidebarMinimized") === "true",
  toggleSidebar: () => {
    set((state) => {
      const next = !state.sidebarMinimized;
      localStorage.setItem("sidebarMinimized", String(next));
      return { sidebarMinimized: next };
    });
  },
}));

export default useUIStore;
