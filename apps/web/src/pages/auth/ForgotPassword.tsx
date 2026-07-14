import * as React from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button, Input } from "@antigravity/ui";
import { api } from "../../lib/axios.js";
import { AuthLayout } from "../../components/auth/AuthLayout.js";

const inputClass =
  "bg-white border-[#E5E5E5] focus:border-amber-500 focus:ring-2 focus:ring-amber-500/15 text-[14px] text-[#111111] placeholder-[#B0B0B0] rounded-[10px] h-11 px-3.5 w-full transition-all";

const otpClass =
  "bg-white border-[#E5E5E5] focus:border-amber-500 focus:ring-2 focus:ring-amber-500/15 text-[#111111] placeholder-[#B0B0B0] rounded-[10px] h-12 text-center tracking-[0.5em] font-mono text-lg w-full transition-all";

const goldButton =
  "w-full h-11 text-[#0a0416] font-bold text-[14px] rounded-[10px] flex items-center justify-center transition-all hover:brightness-110 shadow-[0_10px_30px_-10px_rgba(251,191,36,0.55)] disabled:opacity-70";

const goldStyle: React.CSSProperties = {
  background: "linear-gradient(135deg, #FFE9A0 0%, #F5B849 50%, #F97316 100%)",
};

export function ForgotPassword(): React.JSX.Element {
  const navigate = useNavigate();

  const [email, setEmail] = React.useState("");
  const [emailError, setEmailError] = React.useState("");
  const [isOtpSent, setIsOtpSent] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);

  const [otp, setOtp] = React.useState("");
  const [otpError, setOtpError] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [newPasswordError, setNewPasswordError] = React.useState("");
  const [formError, setFormError] = React.useState("");
  const [formSuccess, setFormSuccess] = React.useState("");
  const [devOtp, setDevOtp] = React.useState("");

  const validateEmail = () => {
    if (!email) { setEmailError("Email address is required"); return false; }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) { setEmailError("Please enter a valid email address"); return false; }
    setEmailError("");
    return true;
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(""); setFormSuccess("");
    if (!validateEmail()) return;
    setIsLoading(true);
    try {
      const response = await api.post("/auth/forgot-password", { email });
      setFormSuccess("Verification OTP has been sent successfully!");
      setIsOtpSent(true);
      if (response.data?.data?.otp) setDevOtp(response.data.data.otp);
    } catch (err: any) {
      setFormError(err.response?.data?.error || "Failed to send OTP code. Ensure email is correct.");
    } finally { setIsLoading(false); }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(""); setFormSuccess("");
    let valid = true;
    if (!otp || otp.length !== 6) { setOtpError("Please enter the 6-digit OTP code"); valid = false; } else setOtpError("");
    if (!newPassword || newPassword.length < 8) { setNewPasswordError("Password must be at least 8 characters"); valid = false; } else setNewPasswordError("");
    if (!valid) return;
    setIsLoading(true);
    try {
      await api.post("/auth/reset-password", { email, otp, newPassword });
      setFormSuccess("Password reset successful! Redirecting to login…");
      setTimeout(() => navigate("/login"), 2000);
    } catch (err: any) {
      setFormError(err.response?.data?.error || "Password reset failed. Ensure OTP is correct.");
    } finally { setIsLoading(false); }
  };

  return (
    <AuthLayout>
      <div className="w-full">
        <div className="mb-7">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-orange-600 mb-3">
            <span className="h-1 w-1 rounded-full bg-orange-600" />
            Account recovery
          </span>
          <h1 className="text-[28px] leading-tight font-bold tracking-tight text-[#111111]">
            {isOtpSent ? "Verify & reset" : "Reset your password"}
          </h1>
          <p className="text-[13.5px] text-[#666666] mt-2">
            {isOtpSent ? "Enter the 6-digit code we sent and choose a new password." : "We'll send a one-time verification code to your email."}
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

        {isOtpSent && devOtp && (
          <div className="mb-5 rounded-[10px] border border-dashed border-amber-400 bg-amber-50 p-3.5 text-[12.5px]">
            <div className="flex items-center gap-2 text-orange-700 font-bold">
              <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
                <path d="M12 2l3 6 6 1-4.5 4.5L18 20l-6-3.5L6 20l1.5-6.5L3 9l6-1 3-6z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
              </svg>
              Sandbox OTP
            </div>
            <p className="mt-1.5 text-[#666666]">
              For testing, your code is:{" "}
              <strong className="text-[#111111] font-mono bg-white border border-amber-200 px-2 py-0.5 rounded ml-1">{devOtp}</strong>
            </p>
          </div>
        )}

        {!isOtpSent ? (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div>
              <label className="block text-[13px] font-semibold text-[#111111] mb-1.5">Business email address</label>
              <Input type="email" placeholder="name@company.com" value={email}
                onChange={(e) => { setEmail(e.target.value); if (emailError) setEmailError(""); }}
                onBlur={validateEmail} error={emailError} disabled={isLoading} required
                className={inputClass}
              />
            </div>
            <Button type="submit" variant="primary" className={`${goldButton} mt-2`} style={goldStyle} disabled={isLoading}>
              {isLoading ? (
                <span className="inline-flex items-center gap-2">
                  <span className="h-3.5 w-3.5 rounded-full border-2 border-[#0a0416]/30 border-t-[#0a0416] animate-spin" />
                  Sending…
                </span>
              ) : ( <>Send verification code →</> )}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label className="block text-[13px] font-semibold text-[#111111] mb-1.5">Email address</label>
              <Input type="email" value={email} disabled className="bg-[#F7F7F7] border-[#E5E5E5] text-[14px] text-[#666666] rounded-[10px] h-11 px-3.5 w-full" />
            </div>
            <div>
              <label className="block text-[13px] font-semibold text-[#111111] mb-1.5">6-digit verification code</label>
              <Input type="text" placeholder="000000" maxLength={6} value={otp}
                onChange={(e) => { setOtp(e.target.value.replace(/\D/g, "")); if (otpError) setOtpError(""); }}
                error={otpError} disabled={isLoading} required
                className={otpClass}
              />
            </div>
            <div>
              <label className="block text-[13px] font-semibold text-[#111111] mb-1.5">New password</label>
              <Input type="password" placeholder="Enter a strong password" value={newPassword}
                onChange={(e) => { setNewPassword(e.target.value); if (newPasswordError) setNewPasswordError(""); }}
                error={newPasswordError} disabled={isLoading} required
                className={inputClass}
              />
            </div>
            <Button type="submit" variant="primary" className={`${goldButton} mt-2`} style={goldStyle} disabled={isLoading}>
              {isLoading ? (
                <span className="inline-flex items-center gap-2">
                  <span className="h-3.5 w-3.5 rounded-full border-2 border-[#0a0416]/30 border-t-[#0a0416] animate-spin" />
                  Saving…
                </span>
              ) : ( <>Save new password →</> )}
            </Button>
          </form>
        )}

        <div className="mt-8 text-center text-[13.5px] text-[#666666]">
          Remember your password?{" "}
          <Link to="/login" className="text-[#111111] font-bold hover:text-orange-600 transition-colors">Back to sign in</Link>
        </div>
      </div>
    </AuthLayout>
  );
}
export default ForgotPassword;
