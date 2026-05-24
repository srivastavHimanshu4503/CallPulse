import { useAuthStore } from "../stores/auth.store.js";
import { useTenantStore } from "../stores/tenant.store.js";
import type { UserSession } from "@antigravity/types";

export function useAuth() {
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const logoutStore = useAuthStore((state) => state.logout);
  const clearTenant = useTenantStore((state) => state.clearTenant);

  const logout = (): void => {
    logoutStore();
    clearTenant();
  };

  return {
    user: user as UserSession | null,
    isAuthenticated,
    logout,
  };
}
export default useAuth;
