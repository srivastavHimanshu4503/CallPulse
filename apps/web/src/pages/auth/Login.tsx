import * as React from "react";
import { useNavigate } from "react-router-dom";
import { Button, Input } from "@antigravity/ui";
import { useAuthStore } from "../../stores/auth.store.js";
import { useTenantStore } from "../../stores/tenant.store.js";

export function Login(): React.JSX.Element {
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);
  const setTenant = useTenantStore((state) => state.setTenant);
  
  const [email, setEmail] = React.useState("owner@indiana.in");
  const [password, setPassword] = React.useState("password123");
  const [error, setError] = React.useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please fill in all fields");
      return;
    }

    // Mock Login Setup for foundation scaffolding testing
    const mockUser = {
      userId: "u-12345",
      tenantId: "t-indiai-99",
      email: email,
      name: "Rajesh Kumar",
      role: "OWNER",
    };
    
    setAuth(mockUser, "mock-access-token", "mock-refresh-token");
    setTenant("t-indiai-99", "Kumar Enterprises (Hinglish Support Active)");
    
    navigate("/");
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background-dark overflow-hidden">
      {/* Decorative premium background lights */}
      <div className="absolute top-1/4 left-1/4 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 h-[400px] w-[400px] translate-x-1/2 translate-y-1/2 rounded-full bg-success/10 blur-[100px] pointer-events-none" />

      {/* Main card */}
      <div className="relative z-10 w-full max-w-md p-8 rounded-2xl border border-border-dark bg-surface-dark bg-opacity-70 backdrop-blur-md shadow-2xl animate-in fade-in zoom-in-95 duration-500">
        
        {/* Branding header */}
        <div className="text-center mb-8">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 text-3xl mb-3 animate-bounce">
            🌀
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-text-dark">Antigravity CRM</h1>
          <p className="mt-2 text-sm text-muted">
            The AI-powered Business OS for Indian SMBs
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-error bg-opacity-10 border border-error border-opacity-20 p-3 text-sm text-error font-medium">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-2">
              Business Email Address
            </label>
            <Input
              type="email"
              placeholder="e.g., rajesh@kumarenterprises.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError("");
              }}
              required
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted">
                Secure Password
              </label>
              <a href="#forgot" className="text-xs text-primary hover:underline">
                Forgot password?
              </a>
            </div>
            <Input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError("");
              }}
              required
            />
          </div>

          {/* Quick Mock Login Notice */}
          <div className="rounded-lg bg-primary/5 border border-primary/10 p-3 text-xs text-muted leading-relaxed">
            <strong className="text-primary">Dev Scaffolding Notice:</strong> Click the button below to instantly sign in with mock credentials and navigate to the premium dashboard layout shell.
          </div>

          <Button type="submit" variant="primary" className="w-full h-11">
            Sign In to Dashboard
          </Button>
        </form>

        <div className="mt-6 text-center text-xs text-muted">
          Don't have an account?{" "}
          <a href="#register" className="text-primary font-medium hover:underline">
            Register your business
          </a>
        </div>
      </div>
    </div>
  );
}
export default Login;
