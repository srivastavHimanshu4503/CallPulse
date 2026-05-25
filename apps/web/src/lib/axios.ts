import axios from "axios";
import { useAuthStore } from "../stores/auth.store.js";

const apiBaseURL = `${(import.meta as any).env?.VITE_API_URL || "http://localhost:3000"}/api/v1`;

export const api = axios.create({
  baseURL: apiBaseURL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Interceptor to inject Authorization Bearer Token
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().accessToken;
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor to handle JWT access token expiration (401 status)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Check if the request is to a core authentication route
    const isAuthRoute = originalRequest.url?.includes("/auth/login") || 
                        originalRequest.url?.includes("/auth/register") ||
                        originalRequest.url?.includes("/auth/forgot-password") ||
                        originalRequest.url?.includes("/auth/reset-password");

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthRoute) {
      originalRequest._retry = true;
      const refreshToken = useAuthStore.getState().refreshToken;

      if (refreshToken) {
        try {
          // Attempt silent refresh
          const response = await axios.post(`${apiBaseURL}/auth/refresh`, {
            refreshToken,
          });

          const { accessToken: newAccessToken, refreshToken: newRefreshToken } = response.data.data;
          
          useAuthStore.getState().setTokens(newAccessToken, newRefreshToken);
          
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return api(originalRequest);
        } catch (refreshError) {
          // If refresh fails, clear auth store and redirect
          useAuthStore.getState().logout();
          window.location.href = "/login";
        }
      } else {
        useAuthStore.getState().logout();
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  }
);

export default api;

