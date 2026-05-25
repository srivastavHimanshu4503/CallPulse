import * as React from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button, Input } from "@antigravity/ui";
import { api } from "../../lib/axios.js";

export function ForgotPassword(): React.JSX.Element {
  const navigate = useNavigate();

  const [email, setEmail] = React.useState("");
  const [emailError, setEmailError] = React.useState("");
  const [isOtpSent, setIsOtpSent] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);

  // OTP and New Password States
  const [otp, setOtp] = React.useState("");
  const [otpError, setOtpError] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [newPasswordError, setNewPasswordError] = React.useState("");
  const [formError, setFormError] = React.useState("");
  const [formSuccess, setFormSuccess] = React.useState("");

  // Dev mode OTP helper
  const [devOtp, setDevOtp] = React.useState("");

  const validateEmail = () => {
    if (!email) {
      setEmailError("Email address is required");
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setEmailError("Please enter a valid email address");
      return false;
    }
    setEmailError("");
    return true;
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");

    if (!validateEmail()) return;

    setIsLoading(true);
    try {
      const response = await api.post("/auth/forgot-password", { email });
      setFormSuccess("Verification OTP has been sent successfully!");
      setIsOtpSent(true);
      
      // Capture and show dev OTP for direct testing convenience
      if (response.data?.data?.otp) {
        setDevOtp(response.data.data.otp);
      }
    } catch (err: any) {
      setFormError(err.response?.data?.error || "Failed to send OTP code. Ensure email is correct.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");
    let valid = true;

    if (!otp || otp.length !== 6) {
      setOtpError("Please enter the 6-digit OTP code");
      valid = false;
    } else {
      setOtpError("");
    }

    if (!newPassword || newPassword.length < 8) {
      setNewPasswordError("Password must be at least 8 characters");
      valid = false;
    } else {
      setNewPasswordError("");
    }

    if (!valid) return;

    setIsLoading(true);
    try {
      await api.post("/auth/reset-password", {
        email,
        otp,
        newPassword,
      });

      setFormSuccess("Password reset successful! Redirecting to login...");
      setTimeout(() => {
        navigate("/login");
      }, 2000);
    } catch (err: any) {
      setFormError(err.response?.data?.error || "Password reset failed. Ensure OTP is correct.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-white font-sans antialiased text-[#111111] px-4">
      {/* 400px wide white centered card, border 1px #E5E5E5, radius 8px, padding 32px (p-8) */}
      <div className="w-full max-w-[400px] bg-white border border-[#E5E5E5] rounded-[8px] p-8 shadow-none">
        
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <svg className="h-5 w-5 text-[#2563EB]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <span className="text-lg font-semibold tracking-tight text-[#111111]">IndiAI</span>
        </div>

        <div className="text-center mb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-[#111111]">
            {isOtpSent ? "Verification" : "Reset Password"}
          </h1>
          <p className="text-sm text-[#666666] mt-1.5 leading-normal">
            {isOtpSent 
              ? "Enter the 6-digit OTP code to verify" 
              : "Enter your registered email address to receive an OTP code"}
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

        {/* Sandbox Developer OTP display panel */}
        {isOtpSent && devOtp && (
          <div className="mb-5 rounded-[6px] border border-[#E5E5E5] bg-[#F7F7F7] p-4 text-xs">
            <span className="font-bold text-[#2563EB]">🤖 Sandbox Developer OTP Helper:</span>
            <p className="mt-1.5 text-[#666666] leading-normal font-medium">
              Numeric OTP code is:{" "}
              <strong className="text-[#111111] font-mono bg-white border border-[#E5E5E5] px-1.5 py-0.5 rounded">
                {devOtp}
              </strong>
            </p>
          </div>
        )}

        {/* Step 1 Form */}
        {!isOtpSent ? (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div>
              <label className="block text-[13px] font-medium text-[#111111] mb-2">
                Business Email Address
              </label>
              <Input
                type="email"
                placeholder="rajesh@kumarenterprises.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (emailError) setEmailError("");
                }}
                onBlur={validateEmail}
                error={emailError}
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
              {isLoading ? "Sending..." : "Send Verification OTP"}
            </Button>
          </form>
        ) : (
          /* Step 2 Form */
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label className="block text-[13px] font-medium text-[#111111] mb-2">
                Email Address
              </label>
              <Input
                type="email"
                value={email}
                disabled
                className="bg-[#F7F7F7] border-[#E5E5E5] text-sm text-[#666666] rounded-[6px] h-10 px-3 w-full"
              />
            </div>

            <div>
              <label className="block text-[13px] font-medium text-[#111111] mb-2">
                6-digit OTP Code
              </label>
              <Input
                type="text"
                placeholder="000000"
                maxLength={6}
                value={otp}
                onChange={(e) => {
                  setOtp(e.target.value.replace(/\D/g, ""));
                  if (otpError) setOtpError("");
                }}
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
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  if (newPasswordError) setNewPasswordError("");
                }}
                error={newPasswordError}
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
              {isLoading ? "Saving..." : "Save New Password"}
            </Button>
          </form>
        )}

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
export default ForgotPassword;
