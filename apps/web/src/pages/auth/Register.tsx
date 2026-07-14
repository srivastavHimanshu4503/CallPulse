import * as React from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button, Input } from "@antigravity/ui";
import { useAuthStore } from "../../stores/auth.store.js";
import { Logo } from "../../components/common/Logo.js";

export function Register(): React.JSX.Element {
  const navigate = useNavigate();
  const register = useAuthStore((state) => state.register);
  const isLoading = useAuthStore((state) => state.isLoading);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  // Flow Step: 1 = Personal, 2 = Business, 3 = Review, 4 = Success
  const [step, setStep] = React.useState(1);

  // Form States
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("+91");
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");

  const [businessName, setBusinessName] = React.useState("");
  const [businessType, setBusinessType] = React.useState("retail");
  const [websiteUrl, setWebsiteUrl] = React.useState("");
  const [teamSize, setTeamSize] = React.useState("SOLO");
  const [agreeTerms, setAgreeTerms] = React.useState(false);

  // Field Errors
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [formError, setFormError] = React.useState("");

  // Redirect if authenticated
  React.useEffect(() => {
    if (isAuthenticated && step !== 4) {
      navigate("/dashboard");
    }
  }, [isAuthenticated, navigate, step]);

  const validateStep1 = () => {
    const errs: Record<string, string> = {};
    
    if (!name.trim()) errs.name = "Full name is required";
    
    if (!email) {
      errs.email = "Email address is required";
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) errs.email = "Please enter a valid email address";
    }

    const indianPhoneRegex = /^\+91[6789]\d{9}$/;
    if (!phone) {
      errs.phone = "Phone number is required";
    } else if (!indianPhoneRegex.test(phone)) {
      errs.phone = "Phone must match +91XXXXXXXXXX";
    }

    if (!password) {
      errs.password = "Password is required";
    } else if (password.length < 8) {
      errs.password = "Password must be at least 8 characters";
    }

    if (password !== confirmPassword) {
      errs.confirmPassword = "Passwords do not match";
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validateStep2 = () => {
    const errs: Record<string, string> = {};
    if (!businessName.trim()) errs.businessName = "Business name is required";
    
    if (websiteUrl) {
      const urlRegex = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/;
      if (!urlRegex.test(websiteUrl)) {
        errs.websiteUrl = "Please enter a valid URL (e.g. https://example.com)";
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNextStep = () => {
    if (step === 1) {
      if (validateStep1()) setStep(2);
    } else if (step === 2) {
      if (validateStep2()) setStep(3);
    }
  };

  const handlePrevStep = () => {
    setStep((prev) => Math.max(1, prev - 1));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreeTerms) {
      setFormError("You must agree to the Terms & Privacy Policy to continue");
      return;
    }

    setFormError("");
    const data = {
      name,
      email,
      password,
      phone,
      businessName,
      businessType,
      websiteUrl: websiteUrl || undefined,
      teamSize,
    };

    try {
      await register(data);
      setStep(4); // Move to Success Screen
    } catch (err: any) {
      setFormError(err.message || "Registration failed. Please check details.");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-white font-sans antialiased text-[#111111] px-4 py-8">
      {/* 400px wide white centered card, border 1px #E5E5E5, radius 8px, padding 32px (p-8) */}
      <div className="w-full max-w-[400px] bg-white border border-[#E5E5E5] rounded-[8px] p-8 shadow-none">
        
        {step < 4 && (
          <>
            {/* Header branding logo */}
            <div className="flex items-center justify-center mb-6">
              <Logo height={72} />
            </div>

            <div className="text-center mb-6">
              <h1 className="text-2xl font-semibold tracking-tight text-[#111111]">Register</h1>
              <p className="text-xs text-[#666666] mt-1.5 font-medium">Step {step} of 3</p>
            </div>

            {/* Stepper Progress bar */}
            <div className="w-full bg-[#E5E5E5] h-[3px] rounded-full mb-8 overflow-hidden">
              <div 
                className="bg-[#2563EB] h-full transition-all duration-300"
                style={{ width: `${(step / 3) * 100}%` }}
              />
            </div>
          </>
        )}

        {/* Step 1: Personal Details */}
        {step === 1 && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <h2 className="text-sm font-semibold text-[#111111] uppercase tracking-wider">Owner Profile</h2>
            
            <div>
              <label className="block text-[13px] font-medium text-[#111111] mb-2">
                Full Name
              </label>
              <Input
                type="text"
                placeholder="Rajesh Kumar"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (errors.name) setErrors((prev) => ({ ...prev, name: "" }));
                }}
                error={errors.name}
                className="bg-white border-[#E5E5E5] focus:border-[#2563EB] text-sm text-[#111111] placeholder-[#999999] rounded-[6px] h-10 px-3 w-full"
              />
            </div>

            <div>
              <label className="block text-[13px] font-medium text-[#111111] mb-2">
                Email Address
              </label>
              <Input
                type="email"
                placeholder="rajesh@kumarenterprises.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email) setErrors((prev) => ({ ...prev, email: "" }));
                }}
                error={errors.email}
                className="bg-white border-[#E5E5E5] focus:border-[#2563EB] text-sm text-[#111111] placeholder-[#999999] rounded-[6px] h-10 px-3 w-full"
              />
            </div>

            <div>
              <label className="block text-[13px] font-medium text-[#111111] mb-2">
                Mobile Number
              </label>
              <Input
                type="tel"
                placeholder="+919876543210"
                value={phone}
                onChange={(e) => {
                  let val = e.target.value;
                  if (!val.startsWith("+91")) {
                    val = "+91" + val.replace(/^\+?9?1?/, "");
                  }
                  setPhone(val);
                  if (errors.phone) setErrors((prev) => ({ ...prev, phone: "" }));
                }}
                error={errors.phone}
                className="bg-white border-[#E5E5E5] focus:border-[#2563EB] text-sm text-[#111111] placeholder-[#999999] rounded-[6px] h-10 px-3 w-full"
              />
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[13px] font-medium text-[#111111] mb-2">
                  Password
                </label>
                <Input
                  type="password"
                  placeholder="Min 8 characters"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errors.password) setErrors((prev) => ({ ...prev, password: "" }));
                  }}
                  error={errors.password}
                  className="bg-white border-[#E5E5E5] focus:border-[#2563EB] text-sm text-[#111111] placeholder-[#999999] rounded-[6px] h-10 px-3 w-full"
                />
              </div>

              <div>
                <label className="block text-[13px] font-medium text-[#111111] mb-2">
                  Confirm Password
                </label>
                <Input
                  type="password"
                  placeholder="Repeat password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (errors.confirmPassword) setErrors((prev) => ({ ...prev, confirmPassword: "" }));
                  }}
                  error={errors.confirmPassword}
                  className="bg-white border-[#E5E5E5] focus:border-[#2563EB] text-sm text-[#111111] placeholder-[#999999] rounded-[6px] h-10 px-3 w-full"
                />
              </div>
            </div>

            <Button
              type="button"
              variant="primary"
              className="w-full h-10 mt-6 bg-[#2563EB] text-white font-semibold text-sm rounded-[6px] flex items-center justify-center hover:bg-[#1D4ED8] transition-colors"
              onClick={handleNextStep}
            >
              Continue
            </Button>

            <div className="mt-4 text-center text-xs text-[#666666]">
              Already registered?{" "}
              <Link to="/login" className="text-[#2563EB] font-semibold hover:underline">
                Sign In
              </Link>
            </div>
          </div>
        )}

        {/* Step 2: Business details */}
        {step === 2 && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <h2 className="text-sm font-semibold text-[#111111] uppercase tracking-wider">Business Info</h2>

            <div>
              <label className="block text-[13px] font-medium text-[#111111] mb-2">
                Business Name
              </label>
              <Input
                type="text"
                placeholder="Rajesh Distributors"
                value={businessName}
                onChange={(e) => {
                  setBusinessName(e.target.value);
                  if (errors.businessName) setErrors((prev) => ({ ...prev, businessName: "" }));
                }}
                error={errors.businessName}
                className="bg-white border-[#E5E5E5] focus:border-[#2563EB] text-sm text-[#111111] placeholder-[#999999] rounded-[6px] h-10 px-3 w-full"
              />
            </div>

            <div>
              <label className="block text-[13px] font-medium text-[#111111] mb-2">
                Business Type
              </label>
              <select
                value={businessType}
                onChange={(e) => setBusinessType(e.target.value)}
                className="w-full rounded-[6px] border border-[#E5E5E5] bg-white px-3 h-10 text-sm text-[#111111] focus:outline-none focus:border-[#2563EB]"
              >
                <option value="retail">Retail Store</option>
                <option value="real_estate">Real Estate</option>
                <option value="garage">Garage / Repair</option>
                <option value="ecommerce">E-commerce</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-[13px] font-medium text-[#111111] mb-2">
                Website URL <span className="text-[#666666] font-normal text-xs">(optional)</span>
              </label>
              <Input
                type="text"
                placeholder="https://example.com"
                value={websiteUrl}
                onChange={(e) => {
                  setWebsiteUrl(e.target.value);
                  if (errors.websiteUrl) setErrors((prev) => ({ ...prev, websiteUrl: "" }));
                }}
                error={errors.websiteUrl}
                className="bg-white border-[#E5E5E5] focus:border-[#2563EB] text-sm text-[#111111] placeholder-[#999999] rounded-[6px] h-10 px-3 w-full"
              />
              <p className="mt-1 text-[12px] text-[#666666]">
                We'll train your AI assistant with this website context.
              </p>
            </div>

            <div>
              <label className="block text-[13px] font-medium text-[#111111] mb-2">
                Team Size
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: "SOLO", label: "Just Me" },
                  { value: "SMALL", label: "2 - 5 people" },
                  { value: "MEDIUM", label: "6 - 20 people" },
                  { value: "LARGE", label: "20+ people" },
                ].map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setTeamSize(item.value)}
                    className={`flex items-center justify-center p-2.5 rounded-[6px] border text-[13px] font-medium transition-all h-10 ${
                      teamSize === item.value
                        ? "border-[#2563EB] bg-[#EFF6FF] text-[#2563EB]"
                        : "border-[#E5E5E5] bg-white text-[#666666] hover:text-[#111111]"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-4 mt-6">
              <Button
                type="button"
                variant="secondary"
                className="w-1/3 h-10 border-[#E5E5E5] bg-white text-[#111111] font-semibold text-sm rounded-[6px]"
                onClick={handlePrevStep}
              >
                Back
              </Button>
              <Button
                type="button"
                variant="primary"
                className="w-2/3 h-10 bg-[#2563EB] text-white font-semibold text-sm rounded-[6px] hover:bg-[#1D4ED8]"
                onClick={handleNextStep}
              >
                Continue
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Review summary */}
        {step === 3 && (
          <form onSubmit={handleSubmit} className="space-y-4 animate-in fade-in duration-150">
            <h2 className="text-sm font-semibold text-[#111111] uppercase tracking-wider">Confirm Details</h2>

            {formError && (
              <div className="rounded-[6px] bg-[#DC2626]/5 border border-[#DC2626]/20 p-3 text-xs text-[#DC2626] font-medium">
                ⚠️ {formError}
              </div>
            )}

            {/* Summary card - background #F7F7F7 very light gray, border 1px solid #E5E5E5, radius 6px */}
            <div className="rounded-[6px] border border-[#E5E5E5] bg-[#F7F7F7] p-5 text-xs space-y-4">
              <div>
                <span className="block text-[10px] font-bold text-[#666666] uppercase mb-0.5">Owner Profile</span>
                <p className="text-[#111111] font-medium text-sm">{name}</p>
                <p className="text-[#666666] mt-0.5">{email} • {phone}</p>
              </div>
              <div className="border-t border-[#E5E5E5] pt-3">
                <span className="block text-[10px] font-bold text-[#666666] uppercase mb-0.5">Business Account</span>
                <p className="text-[#111111] font-medium text-sm">{businessName}</p>
                <p className="text-[#666666] mt-0.5 capitalize">
                  {businessType.replace("_", " ")} Category • {teamSize.toLowerCase()} size
                </p>
                {websiteUrl && <p className="text-[#2563EB] truncate mt-1">{websiteUrl}</p>}
              </div>
            </div>

            {/* Checkbox */}
            <div className="flex items-start gap-2.5 pt-2">
              <input
                type="checkbox"
                id="agreeTerms"
                checked={agreeTerms}
                onChange={(e) => {
                  setAgreeTerms(e.target.checked);
                  if (formError) setFormError("");
                }}
                className="mt-0.5 rounded border-[#E5E5E5] bg-white text-[#2563EB] focus:ring-0 cursor-pointer"
              />
              <label htmlFor="agreeTerms" className="text-xs text-[#666666] leading-relaxed cursor-pointer select-none">
                I agree to the <span className="text-[#2563EB] font-semibold hover:underline">Terms of Service</span> &{" "}
                <span className="text-[#2563EB] font-semibold hover:underline">Privacy Policy</span>.
              </label>
            </div>

            <div className="flex gap-4 pt-4">
              <Button
                type="button"
                variant="secondary"
                className="w-1/3 h-10 border-[#E5E5E5] bg-white text-[#111111] font-semibold text-sm rounded-[6px]"
                onClick={handlePrevStep}
                disabled={isLoading}
              >
                Back
              </Button>
              <Button
                type="submit"
                variant="primary"
                className="w-2/3 h-10 bg-[#2563EB] text-white font-semibold text-sm rounded-[6px] flex items-center justify-center hover:bg-[#1D4ED8]"
                disabled={isLoading}
              >
                {isLoading ? "Creating..." : "Create Account"}
              </Button>
            </div>
          </form>
        )}

        {/* Step 4: Success Screen */}
        {step === 4 && (
          <div className="text-center py-4 animate-in fade-in duration-300">
            {/* SVG Checkmark */}
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#16A34A]/10 border border-[#16A34A]/20 text-[#16A34A] mb-5">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            
            <h2 className="text-xl font-semibold text-[#111111] mb-2 tracking-tight">
              Welcome to Indi AI, {name}!
            </h2>
            <p className="text-xs text-[#666666] leading-relaxed max-w-sm mx-auto mb-6">
              Your business workspace and custom support AI agent have been configured successfully.
            </p>

            <Button
              type="button"
              variant="primary"
              className="w-full h-10 bg-[#2563EB] text-white font-semibold text-sm rounded-[6px] hover:bg-[#1D4ED8]"
              onClick={() => navigate("/dashboard")}
            >
              Go to Dashboard
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
export default Register;
