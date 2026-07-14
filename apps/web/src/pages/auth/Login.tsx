import * as React from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button, Input } from "@antigravity/ui";
import { useAuthStore } from "../../stores/auth.store.js";
import { AuthLayout } from "../../components/auth/AuthLayout.js";

const inputClass =
  "bg-white border-[#E5E5E5] focus:border-amber-500 focus:ring-2 focus:ring-amber-500/15 text-[14px] text-[#111111] placeholder-[#B0B0B0] rounded-[10px] h-11 px-3.5 w-full transition-all";

const goldButton =
  "w-full h-11 text-[#0a0416] font-bold text-[14px] rounded-[10px] flex items-center justify-center transition-all hover:brightness-110 shadow-[0_10px_30px_-10px_rgba(251,191,36,0.55)] disabled:opacity-70";

const goldStyle: React.CSSProperties = {
  background: "linear-gradient(135deg, #FFE9A0 0%, #F5B849 50%, #F97316 100%)",
};

export function Login(): React.JSX.Element {
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);
  const isLoading = useAuthStore((state) => state.isLoading);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);

  const [emailError, setEmailError] = React.useState("");
  const [passwordError, setPasswordError] = React.useState("");
  const [formError, setFormError] = React.useState("");

  React.useEffect(() => {
    if (isAuthenticated) {
      navigate("/dashboard");
    }
  }, [isAuthenticated, navigate]);

  const validateEmail = (val: string) => {
    if (!val) { setEmailError("Email address is required"); return false; }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(val)) { setEmailError("Please enter a valid email address"); return false; }
    setEmailError("");
    return true;
  };

  const validatePassword = (val: string) => {
    if (!val) { setPasswordError("Password is required"); return false; }
    if (val.length < 8) { setPasswordError("Password must be at least 8 characters"); return false; }
    setPasswordError("");
    return true;
  };

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
    <AuthLayout>
      <div className="w-full">
        <div className="mb-7">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-orange-600 mb-3">
            <span className="h-1 w-1 rounded-full bg-orange-600" />
            Welcome back
          </span>
          <h1 className="text-[30px] leading-tight font-bold tracking-tight text-[#111111]">
            Sign in to your workspace
          </h1>
          <p className="text-[14px] text-[#666666] mt-2">
            Log in to manage your AI receptionist, calls, and leads.
          </p>
        </div>

        {formError && (
          <div className="mb-5 rounded-[10px] bg-rose-50 border border-rose-200 p-3.5 text-[13px] text-rose-700 font-medium leading-normal flex items-start gap-2.5">
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 mt-0.5 shrink-0">
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
              <path d="M12 8v5M12 16.5v.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
            <span className="flex-1">{formError}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-[13px] font-semibold text-[#111111] mb-1.5">Email address</label>
            <Input
              type="email" placeholder="name@company.com" value={email}
              onChange={(e) => { setEmail(e.target.value); if (emailError) validateEmail(e.target.value); }}
              onBlur={() => validateEmail(email)}
              error={emailError} disabled={isLoading} required
              className={inputClass}
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-[13px] font-semibold text-[#111111]">Password</label>
              <Link to="/forgot-password" className="text-[12.5px] text-orange-600 hover:text-orange-700 font-semibold">
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"} placeholder="Enter your password" value={password}
                onChange={(e) => { setPassword(e.target.value); if (passwordError) validatePassword(e.target.value); }}
                onBlur={() => validatePassword(password)}
                error={passwordError} disabled={isLoading} required
                className={`${inputClass} pr-14`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#666666] hover:text-[#111111] text-[11.5px] font-semibold focus:outline-none uppercase tracking-wider"
                tabIndex={-1}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          <Button type="submit" variant="primary" className={`${goldButton} mt-2`} style={goldStyle} disabled={isLoading}>
            {isLoading ? (
              <span className="inline-flex items-center gap-2">
                <span className="h-3.5 w-3.5 rounded-full border-2 border-[#0a0416]/30 border-t-[#0a0416] animate-spin" />
                Signing in…
              </span>
            ) : (
              <>Sign in →</>
            )}
          </Button>
        </form>

        <div className="mt-8 text-center text-[13.5px] text-[#666666]">
          New to Indi AI?{" "}
          <Link to="/register" className="text-[#111111] font-bold hover:text-orange-600 transition-colors">
            Create a business account
          </Link>
        </div>
      </div>
    </AuthLayout>
  );
}
export default Login;
