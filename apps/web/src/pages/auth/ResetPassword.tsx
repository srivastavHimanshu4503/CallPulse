import * as React from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { Button, Input } from "@antigravity/ui";
import { api } from "../../lib/axios.js";
import { AuthLayout } from "../../components/auth/AuthLayout.js";

const inputClass =
  "bg-bg-raised border-border focus:border-amber-500 focus:ring-2 focus:ring-amber-500/15 text-[14px] text-text-primary placeholder-text-placeholder rounded-[10px] h-11 px-3.5 w-full transition-all";

const otpClass =
  "bg-bg-raised border-border focus:border-amber-500 focus:ring-2 focus:ring-amber-500/15 text-text-primary placeholder-text-placeholder rounded-[10px] h-12 text-center tracking-[0.5em] font-mono text-lg w-full transition-all";

const goldButton =
  "w-full h-11 text-[#0a0416] font-bold text-[14px] rounded-[10px] flex items-center justify-center transition-all hover:brightness-110 shadow-[0_10px_30px_-10px_rgba(251,191,36,0.55)] disabled:opacity-70";

const goldStyle: React.CSSProperties = {
  background: "linear-gradient(135deg, #FFE9A0 0%, #F5B849 50%, #F97316 100%)",
};

export function ResetPassword(): React.JSX.Element {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [email, setEmail] = React.useState(searchParams.get("email") || "");
  const [otp, setOtp] = React.useState(searchParams.get("otp") || "");
  const [newPassword, setNewPassword] = React.useState("");

  const [emailError, setEmailError] = React.useState("");
  const [otpError, setOtpError] = React.useState("");
  const [passwordError, setPasswordError] = React.useState("");
  const [formError, setFormError] = React.useState("");
  const [formSuccess, setFormSuccess] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(""); setFormSuccess("");
    let valid = true;
    if (!email) { setEmailError("Email is required"); valid = false; } else setEmailError("");
    if (!otp || otp.length !== 6) { setOtpError("OTP code must be 6 digits"); valid = false; } else setOtpError("");
    if (!newPassword || newPassword.length < 8) { setPasswordError("Password must be at least 8 characters"); valid = false; } else setPasswordError("");
    if (!valid) return;
    setIsLoading(true);
    try {
      await api.post("/auth/reset-password", { email, otp, newPassword });
      setFormSuccess("Password reset successfully! Redirecting to login…");
      setTimeout(() => navigate("/login"), 2000);
    } catch (err: any) {
      setFormError(err.response?.data?.error || "Password reset failed. Please check OTP.");
    } finally { setIsLoading(false); }
  };

  return (
    <AuthLayout>
      <div className="w-full">
        <div className="mb-7">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-orange-600 mb-3">
            <span className="h-1 w-1 rounded-full bg-orange-600" />
            Reset password
          </span>
          <h1 className="text-[28px] leading-tight font-bold tracking-tight text-text-primary">Set a new password</h1>
          <p className="text-[13.5px] text-text-secondary mt-2">
            Enter your email, recovery code, and a new secure password.
          </p>
        </div>

        {formError && (
          <div className="mb-5 rounded-[10px] bg-rose-50 border border-rose-200 p-3.5 text-[13px] text-rose-700 font-medium leading-normal flex items-start gap-2.5">
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 mt-0.5 shrink-0">
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
              <path d="M12 8v5M12 16.5v.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
            <span>{formError}</span>
          </div>
        )}

        {formSuccess && (
          <div className="mb-5 rounded-[10px] bg-emerald-50 border border-emerald-200 p-3.5 text-[13px] text-emerald-700 font-medium leading-normal flex items-start gap-2.5">
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 mt-0.5 shrink-0">
              <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>{formSuccess}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[13px] font-semibold text-text-primary mb-1.5">Registered email</label>
            <Input type="email" placeholder="name@company.com" value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={emailError} disabled={isLoading} required
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-[13px] font-semibold text-text-primary mb-1.5">Verification code</label>
            <Input type="text" placeholder="000000" maxLength={6} value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              error={otpError} disabled={isLoading} required
              className={otpClass}
            />
          </div>
          <div>
            <label className="block text-[13px] font-semibold text-text-primary mb-1.5">New password</label>
            <Input type="password" placeholder="Enter a strong password" value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              error={passwordError} disabled={isLoading} required
              className={inputClass}
            />
          </div>
          <Button type="submit" variant="primary" className={`${goldButton} mt-2`} style={goldStyle} disabled={isLoading}>
            {isLoading ? (
              <span className="inline-flex items-center gap-2">
                <span className="h-3.5 w-3.5 rounded-full border-2 border-[#0a0416]/30 border-t-[#0a0416] animate-spin" />
                Saving…
              </span>
            ) : ( <>Save password →</> )}
          </Button>
        </form>

        <div className="mt-8 text-center text-[13.5px] text-text-secondary">
          Remember your password?{" "}
          <Link to="/login" className="text-text-primary font-bold hover:text-orange-600 transition-colors">Back to sign in</Link>
        </div>
      </div>
    </AuthLayout>
  );
}
export default ResetPassword;
