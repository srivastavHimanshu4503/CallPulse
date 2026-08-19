import { create } from "zustand";

export type Theme = "light" | "dark";

function applyTheme(theme: Theme): void {
  document.documentElement.classList.toggle("dark", theme === "dark");
}

const initialTheme: Theme = localStorage.getItem("theme") === "dark" ? "dark" : "light";

interface UIState {
  sidebarMinimized: boolean;
  toggleSidebar: () => void;
  mobileSidebarOpen: boolean;
  setMobileSidebarOpen: (open: boolean) => void;
  theme: Theme;
  toggleTheme: () => void;
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
  mobileSidebarOpen: false,
  setMobileSidebarOpen: (open) => set({ mobileSidebarOpen: open }),
  theme: initialTheme,
  toggleTheme: () => {
    set((state) => {
      const next: Theme = state.theme === "dark" ? "light" : "dark";
      localStorage.setItem("theme", next);
      applyTheme(next);
      return { theme: next };
    });
  },
}));

export default useUIStore;
