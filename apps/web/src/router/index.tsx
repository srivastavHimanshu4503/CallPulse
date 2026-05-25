import * as React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuthStore } from "../stores/auth.store.js";

// Lazy-loaded pages as per Rules
const Dashboard = React.lazy(() => import("../pages/dashboard/Dashboard.js"));
const Login = React.lazy(() => import("../pages/auth/Login.js"));
const Register = React.lazy(() => import("../pages/auth/Register.js"));
const ForgotPassword = React.lazy(() => import("../pages/auth/ForgotPassword.js"));
const ResetPassword = React.lazy(() => import("../pages/auth/ResetPassword.js"));
const Agents = React.lazy(() => import("../pages/agents/Agents.js"));
const AgentLogs = React.lazy(() => import("../pages/agents/AgentLogs.js"));
const CRM = React.lazy(() => import("../pages/crm/CRM.js"));

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
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return (
    <React.Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#0F0F0F] text-[#6366F1] text-lg font-bold">
          <div className="animate-spin text-3xl mr-3">🌀</div> Loading Antigravity...
        </div>
      }
    >
      <Routes>
        {/* Auth routing shortcuts */}
        <Route 
          path="/" 
          element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />} 
        />

        {/* Protected Dashboard Route */}
        <Route
          path="/dashboard"
          element={
            <AuthGuard>
              <Dashboard />
            </AuthGuard>
          }
        />

        {/* Protected CRM Route */}
        <Route
          path="/crm"
          element={
            <AuthGuard>
              <CRM />
            </AuthGuard>
          }
        />

        {/* Protected Agents Routes */}
        <Route
          path="/agents"
          element={
            <AuthGuard>
              <Agents />
            </AuthGuard>
          }
        />

        <Route
          path="/agents/:id/logs"
          element={
            <AuthGuard>
              <AgentLogs />
            </AuthGuard>
          }
        />

        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* Fallback Catch-All */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </React.Suspense>
  );
}
export default AppRouter;

