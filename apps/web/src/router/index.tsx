import * as React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuthStore } from "../stores/auth.store.js";
import { Logo } from "../components/common/Logo.js";
import { useEntitlements } from "../hooks/useEntitlements.js";
import { UpgradeGate } from "../components/common/UpgradeGate.js";
import { PageWrapper } from "../components/layout/PageWrapper.js";
import type { FeatureKey } from "@antigravity/types";

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
const Calendar = React.lazy(() => import("../pages/calendar/Calendar.js"));

interface AuthGuardProps {
  children: React.JSX.Element;
}

/**
 * Plan gate for whole pages. Friendly UX layer only — the API enforces the
 * same gates server-side, so bypassing this changes nothing.
 */
function FeatureGuard({
  feature,
  children,
}: {
  feature: FeatureKey;
  children: React.JSX.Element;
}): React.JSX.Element {
  const ent = useEntitlements();
  if (ent.isLoading) return <PageWrapper>{null}</PageWrapper>;
  if (!ent.can(feature)) {
    return (
      <PageWrapper>
        <UpgradeGate feature={feature} />
      </PageWrapper>
    );
  }
  return children;
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
        <div className="flex min-h-screen flex-col items-center justify-center bg-bg-canvas gap-4">
          <Logo height={96} className="animate-pulse" />
          <div className="text-sm font-medium text-text-secondary">Loading DeskBuddy...</div>
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
              <FeatureGuard feature="CONTACT_DETAILS">
                <ContactRecord />
              </FeatureGuard>
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
              <FeatureGuard feature="WEBSITE_WIDGET">
                <Widget />
              </FeatureGuard>
            </AuthGuard>
          }
        />

        {/* Protected Analytics Route */}
        <Route
          path="/analytics"
          element={
            <AuthGuard>
              <FeatureGuard feature="ANALYTICS_PAGE">
                <Analytics />
              </FeatureGuard>
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

        {/* Protected Calendar Route */}
        <Route
          path="/calendar"
          element={
            <AuthGuard>
              <Calendar />
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
