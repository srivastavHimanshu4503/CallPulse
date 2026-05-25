import * as React from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button, Input } from "@antigravity/ui";
import { useAuthStore } from "../../stores/auth.store.js";

export function Login(): React.JSX.Element {
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);
  const isLoading = useAuthStore((state) => state.isLoading);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  
  // Real-time validations
  const [emailError, setEmailError] = React.useState("");
  const [passwordError, setPasswordError] = React.useState("");
  const [formError, setFormError] = React.useState("");

  React.useEffect(() => {
    if (isAuthenticated) {
      navigate("/dashboard");
    }
  }, [isAuthenticated, navigate]);

  const validateEmail = (val: string) => {
    if (!val) {
      setEmailError("Email address is required");
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(val)) {
      setEmailError("Please enter a valid email address");
      return false;
    }
    setEmailError("");
    return true;
  };

  const validatePassword = (val: string) => {
    if (!val) {
      setPasswordError("Password is required");
      return false;
    }
    if (val.length < 8) {
      setPasswordError("Password must be at least 8 characters");
      return false;
    }
    setPasswordError("");
    return true;
  };

  const handleBlurEmail = () => validateEmail(email);
  const handleBlurPassword = () => validatePassword(password);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    const isEmailValid = validateEmail(email);
    const isPasswordValid = validatePassword(password);

    if (!isEmailValid || !isPasswordValid) return;

    try {
      await login(email, password);
      navigate("/dashboard");
    } catch (err: any) {
      setFormError(err.message || "Invalid email or password");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-white font-sans antialiased text-[#111111] px-4">
      {/* 400px wide centered white card, border 1px #E5E5E5, radius 8px, padding 32px (p-8) */}
      <div className="w-full max-w-[400px] bg-white border border-[#E5E5E5] rounded-[8px] p-8 shadow-none">
        
        {/* Simple Branding logo */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <svg className="h-5 w-5 text-[#2563EB]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <span className="text-lg font-semibold tracking-tight text-[#111111]">IndiAI</span>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold tracking-tight text-[#111111]">Sign in</h1>
          <p className="text-sm text-[#666666] mt-1.5">to access your SMB workspace</p>
        </div>

        {formError && (
          <div className="mb-5 rounded-[6px] bg-[#DC2626]/5 border border-[#DC2626]/20 p-3.5 text-xs text-[#DC2626] font-medium leading-normal flex items-start gap-2">
            <span>⚠️</span>
            <div className="flex-1">{formError}</div>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-[13px] font-medium text-[#111111] mb-2">
              Email Address
            </label>
            <Input
              type="email"
              placeholder="name@company.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (emailError) validateEmail(e.target.value);
              }}
              onBlur={handleBlurEmail}
              error={emailError}
              disabled={isLoading}
              required
              className="bg-white border-[#E5E5E5] focus:border-[#2563EB] text-sm text-[#111111] placeholder-[#999999] rounded-[6px] h-10 px-3 focus:ring-0 w-full"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-[13px] font-medium text-[#111111]">
                Password
              </label>
              <Link to="/forgot-password" className="text-[13px] text-[#2563EB] hover:text-[#1D4ED8] focus:outline-none font-medium">
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (passwordError) validatePassword(e.target.value);
                }}
                onBlur={handleBlurPassword}
                error={passwordError}
                disabled={isLoading}
                required
                className="bg-white border-[#E5E5E5] focus:border-[#2563EB] text-sm text-[#111111] placeholder-[#999999] rounded-[6px] h-10 pl-3 pr-12 focus:ring-0 w-full"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-3 text-[#666666] hover:text-[#111111] text-[12px] font-medium focus:outline-none"
                tabIndex={-1}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          <Button 
            type="submit" 
            variant="primary" 
            className="w-full h-10 bg-[#2563EB] text-white font-semibold text-sm rounded-[6px] flex items-center justify-center hover:bg-[#1D4ED8] transition-colors focus:ring-0 mt-6 shadow-none"
            disabled={isLoading}
          >
            {isLoading ? "Signing in..." : "Sign In"}
          </Button>
        </form>

        <div className="mt-8 border-t border-[#E5E5E5] pt-5 text-center text-sm text-[#666666]">
          Don't have an account?{" "}
          <Link to="/register" className="text-[#2563EB] font-semibold hover:underline">
            Register your business
          </Link>
        </div>
      </div>
    </div>
  );
}
export default Login;
