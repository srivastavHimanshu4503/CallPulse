import { create } from "zustand";
import type { SerializedUser, SerializedTenant } from "@antigravity/types";
import { api } from "../lib/axios.js";

interface AuthState {
  user: SerializedUser | null;
  tenant: SerializedTenant | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  login: (email: string, password: string, businessSlug?: string) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => void;
  refreshTokens: () => Promise<void>;
  setAuth: (user: SerializedUser, tenant: SerializedTenant, tokens: { accessToken: string; refreshToken: string }) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
}

// Safely parse JSON from localStorage
const getLocalStorageItem = <T>(key: string): T | null => {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: getLocalStorageItem<SerializedUser>("user"),
  tenant: getLocalStorageItem<SerializedTenant>("tenant"),
  accessToken: localStorage.getItem("accessToken"),
  refreshToken: localStorage.getItem("refreshToken"),
  isAuthenticated: !!localStorage.getItem("accessToken"),
  isLoading: false,

  setAuth: (user, tenant, tokens) => {
    localStorage.setItem("user", JSON.stringify(user));
    localStorage.setItem("tenant", JSON.stringify(tenant));
    localStorage.setItem("accessToken", tokens.accessToken);
    localStorage.setItem("refreshToken", tokens.refreshToken);
    set({
      user,
      tenant,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      isAuthenticated: true,
      isLoading: false,
    });
  },

  setTokens: (accessToken, refreshToken) => {
    localStorage.setItem("accessToken", accessToken);
    localStorage.setItem("refreshToken", refreshToken);
    set({
      accessToken,
      refreshToken,
      isAuthenticated: true,
    });
  },

  login: async (email, password, businessSlug) => {
    set({ isLoading: true });
    try {
      const response = await api.post("/auth/login", { email, password, businessSlug });
      const { user, tenant, tokens } = response.data.data;
      get().setAuth(user, tenant, tokens);
    } catch (error: any) {
      set({ isLoading: false });
      throw new Error(error.response?.data?.error || "Login failed");
    }
  },

  register: async (data) => {
    set({ isLoading: true });
    try {
      const response = await api.post("/auth/register", data);
      const { user, tenant, tokens } = response.data.data;
      get().setAuth(user, tenant, tokens);
    } catch (error: any) {
      set({ isLoading: false });
      throw new Error(error.response?.data?.error || "Registration failed");
    }
  },

  logout: () => {
    // Clear local storage
    localStorage.removeItem("user");
    localStorage.removeItem("tenant");
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    set({
      user: null,
      tenant: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
    });
    // Fire stateless logout in background
    api.post("/auth/logout").catch(() => {});
  },

  refreshTokens: async () => {
    const { refreshToken } = get();
    if (!refreshToken) return;
    
    try {
      const response = await api.post("/auth/refresh", { refreshToken });
      const { accessToken: newAccessToken, refreshToken: newRefreshToken } = response.data.data;
      get().setTokens(newAccessToken, newRefreshToken);
    } catch (error) {
      get().logout();
    }
  },
}));

export default useAuthStore;
