import * as React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuthStore } from "../stores/auth.store.js";
import { Logo } from "../components/common/Logo.js";

// Lazy-loaded pages as per Rules
const Dashboard = React.lazy(() => import("../pages/dashboard/Dashboard.js"));
const Login = React.lazy(() => import("../pages/auth/Login.js"));
const Register = React.lazy(() => import("../pages/auth/Register.js"));
const ForgotPassword = React.lazy(() => import("../pages/auth/ForgotPassword.js"));
const ResetPassword = React.lazy(() => import("../pages/auth/ResetPassword.js"));
const Agents = React.lazy(() => import("../pages/agents/Agents.js"));
const AgentLogs = React.lazy(() => import("../pages/agents/AgentLogs.js"));
const CRM = React.lazy(() => import("../pages/crm/CRM.js"));
const ContactRecord = React.lazy(() => import("../pages/crm/ContactRecord.js"));
const Workflows = React.lazy(() => import("../pages/workflows/Workflows.js"));
const WorkflowBuilder = React.lazy(() => import("../pages/workflows/WorkflowBuilder.js"));
const Widget = React.lazy(() => import("../pages/widget/Widget.js"));
const Analytics = React.lazy(() => import("../pages/analytics/Analytics.js"));
const Notifications = React.lazy(() => import("../pages/notifications/Notifications.js"));
const Settings = React.lazy(() => import("../pages/settings/Settings.js"));

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
        <div className="flex min-h-screen flex-col items-center justify-center bg-white gap-4">
          <Logo height={96} className="animate-pulse" />
          <div className="text-sm font-medium text-[#666666]">Loading Indi AI...</div>
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

        {/* Protected CRM Routes */}
        <Route
          path="/crm"
          element={
            <AuthGuard>
              <CRM />
            </AuthGuard>
          }
        />
        <Route
          path="/crm/contacts/:id"
          element={
            <AuthGuard>
              <ContactRecord />
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

        {/* Protected Workflows Routes */}
        <Route
          path="/workflows"
          element={
            <AuthGuard>
              <Workflows />
            </AuthGuard>
          }
        />
        <Route
          path="/workflows/:id"
          element={
            <AuthGuard>
              <WorkflowBuilder />
            </AuthGuard>
          }
        />

        {/* Protected Widget Route */}
        <Route
          path="/widget"
          element={
            <AuthGuard>
              <Widget />
            </AuthGuard>
          }
        />

        {/* Protected Analytics Route */}
        <Route
          path="/analytics"
          element={
            <AuthGuard>
              <Analytics />
            </AuthGuard>
          }
        />

        {/* Protected Notifications Route */}
        <Route
          path="/notifications"
          element={
            <AuthGuard>
              <Notifications />
            </AuthGuard>
          }
        />

        {/* Protected Settings Route */}
        <Route
          path="/settings"
          element={
            <AuthGuard>
              <Settings />
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

