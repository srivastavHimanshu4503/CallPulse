import * as React from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { Button, Input } from "@antigravity/ui";
import { api } from "../../lib/axios.js";
import { Logo } from "../../components/common/Logo.js";

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
    setFormError("");
    setFormSuccess("");
    let valid = true;

    if (!email) {
      setEmailError("Email is required");
      valid = false;
    } else {
      setEmailError("");
    }

    if (!otp || otp.length !== 6) {
      setOtpError("OTP code must be 6 digits");
      valid = false;
    } else {
      setOtpError("");
    }

    if (!newPassword || newPassword.length < 8) {
      setPasswordError("Password must be at least 8 characters");
      valid = false;
    } else {
      setPasswordError("");
    }

    if (!valid) return;

    setIsLoading(true);
    try {
      await api.post("/auth/reset-password", {
        email,
        otp,
        newPassword,
      });

      setFormSuccess("Password reset successfully! Redirecting to login...");
      setTimeout(() => {
        navigate("/login");
      }, 2000);
    } catch (err: any) {
      setFormError(err.response?.data?.error || "Password reset failed. Please check OTP.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-white font-sans antialiased text-[#111111] px-4">
      {/* 400px wide white centered card, border 1px #E5E5E5, radius 8px, padding 32px (p-8) */}
      <div className="w-full max-w-[400px] bg-white border border-[#E5E5E5] rounded-[8px] p-8 shadow-none">
        
        {/* Logo */}
        <div className="flex items-center justify-center mb-6">
          <Logo height={72} />
        </div>

        <div className="text-center mb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-[#111111]">Reset Password</h1>
          <p className="text-sm text-[#666666] mt-1.5 leading-normal">
            Enter your email, recovery OTP, and new secure password
          </p>
        </div>

        {formError && (
          <div className="mb-5 rounded-[6px] bg-[#DC2626]/5 border border-[#DC2626]/20 p-3.5 text-xs text-[#DC2626] font-medium leading-normal">
            ⚠️ {formError}
          </div>
        )}

        {formSuccess && (
          <div className="mb-5 rounded-[6px] bg-[#16A34A]/5 border border-[#16A34A]/20 p-3.5 text-xs text-[#16A34A] font-medium leading-normal">
            ✓ {formSuccess}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[13px] font-medium text-[#111111] mb-2">
              Registered Email Address
            </label>
            <Input
              type="email"
              placeholder="rajesh@kumarenterprises.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={emailError}
              disabled={isLoading}
              required
              className="bg-white border-[#E5E5E5] focus:border-[#2563EB] text-sm text-[#111111] placeholder-[#999999] rounded-[6px] h-10 px-3 w-full"
            />
          </div>

          <div>
            <label className="block text-[13px] font-medium text-[#111111] mb-2">
              Verification Code (OTP)
            </label>
            <Input
              type="text"
              placeholder="000000"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              error={otpError}
              disabled={isLoading}
              required
              className="bg-white border-[#E5E5E5] focus:border-[#2563EB] text-sm text-[#111111] placeholder-[#999999] rounded-[6px] h-10 text-center tracking-widest font-mono text-lg w-full"
            />
          </div>

          <div>
            <label className="block text-[13px] font-medium text-[#111111] mb-2">
              New Secure Password
            </label>
            <Input
              type="password"
              placeholder="Enter new password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              error={passwordError}
              disabled={isLoading}
              required
              className="bg-white border-[#E5E5E5] focus:border-[#2563EB] text-sm text-[#111111] placeholder-[#999999] rounded-[6px] h-10 px-3 w-full"
            />
          </div>

          <Button 
            type="submit" 
            variant="primary" 
            className="w-full h-10 bg-[#2563EB] text-white font-semibold text-sm rounded-[6px] flex items-center justify-center hover:bg-[#1D4ED8] mt-6"
            disabled={isLoading}
          >
            {isLoading ? "Saving..." : "Save Password"}
          </Button>
        </form>

        <div className="mt-8 border-t border-[#E5E5E5] pt-5 text-center text-sm text-[#666666]">
          Remember your password?{" "}
          <Link to="/login" className="text-[#2563EB] font-semibold hover:underline">
            Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
export default ResetPassword;
