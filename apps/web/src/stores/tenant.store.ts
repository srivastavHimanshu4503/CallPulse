import { create } from "zustand";

interface TenantState {
  tenantId: string | null;
  tenantName: string | null;
  setTenant: (tenantId: string, tenantName: string) => void;
  clearTenant: () => void;
}

export const useTenantStore = create<TenantState>((set) => ({
  tenantId: localStorage.getItem("tenantId"),
  tenantName: localStorage.getItem("tenantName"),

  setTenant: (tenantId, tenantName) => {
    localStorage.setItem("tenantId", tenantId);
    localStorage.setItem("tenantName", tenantName);
    set({ tenantId, tenantName });
  },

  clearTenant: () => {
    localStorage.removeItem("tenantId");
    localStorage.removeItem("tenantName");
    set({ tenantId: null, tenantName: null });
  },
}));
export default useTenantStore;
