import * as React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuthStore } from "../stores/auth.store.js";

// Lazy-loaded pages as per Rules
const Dashboard = React.lazy(() => import("../pages/dashboard/Dashboard.js"));
const Login = React.lazy(() => import("../pages/auth/Login.js"));

interface AuthGuardProps {
  children: React.JSX.Element;
}

function AuthGuard({ children }: AuthGuardProps): React.JSX.Element {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

export function AppRouter(): React.JSX.Element {
  return (
    <React.Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background-dark text-primary text-lg font-bold">
          <div className="animate-spin text-3xl mr-3">🌀</div> Loading Antigravity...
        </div>
      }
    >
      <Routes>
        {/* Protected Dashboard Route */}
        <Route
          path="/"
          element={
            <AuthGuard>
              <Dashboard />
            </AuthGuard>
          }
        />

        {/* Public Login Route */}
        <Route path="/login" element={<Login />} />

        {/* Fallback Catch-All */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </React.Suspense>
  );
}
export default AppRouter;
