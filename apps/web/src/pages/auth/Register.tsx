import * as React from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button, Input } from "@antigravity/ui";
import { useAuthStore } from "../../stores/auth.store.js";
import { AuthLayout } from "../../components/auth/AuthLayout.js";

const inputClass =
  "bg-bg-raised border-border focus:border-amber-500 focus:ring-2 focus:ring-amber-500/15 text-[14px] text-text-primary placeholder-text-placeholder rounded-[10px] h-11 px-3.5 w-full transition-all";

const primaryButton =
  "text-white font-bold text-[14px] rounded-[6px] flex items-center justify-center transition-colors bg-brand-500 hover:bg-brand-600 shadow-sm disabled:opacity-70";

const ghostButton =
  "border border-border bg-bg-raised text-text-primary font-semibold text-[14px] rounded-[10px] hover:bg-surface transition-all";

export function Register(): React.JSX.Element {
  const navigate = useNavigate();
  const register = useAuthStore((state) => state.register);
  const isLoading = useAuthStore((state) => state.isLoading);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const [step, setStep] = React.useState(1);

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

  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [formError, setFormError] = React.useState("");

  React.useEffect(() => {
    if (isAuthenticated && step !== 4) {
      navigate("/dashboard");
    }
  }, [isAuthenticated, navigate, step]);

  const validateStep1 = () => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = "Full name is required";
    if (!email) errs.email = "Email address is required";
    else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) errs.email = "Please enter a valid email address";
    }
    const indianPhoneRegex = /^\+91[6789]\d{9}$/;
    if (!phone) errs.phone = "Phone number is required";
    else if (!indianPhoneRegex.test(phone)) errs.phone = "Phone must match +91XXXXXXXXXX";
    if (!password) errs.password = "Password is required";
    else if (password.length < 8) errs.password = "Password must be at least 8 characters";
    if (password !== confirmPassword) errs.confirmPassword = "Passwords do not match";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validateStep2 = () => {
    const errs: Record<string, string> = {};
    if (!businessName.trim()) errs.businessName = "Business name is required";
    if (websiteUrl) {
      const urlRegex = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/;
      if (!urlRegex.test(websiteUrl))
        errs.websiteUrl = "Please enter a valid URL (e.g. https://example.com)";
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
  const handlePrevStep = () => setStep((prev) => Math.max(1, prev - 1));

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
      setStep(4);
    } catch (err: any) {
      setFormError(err.message || "Registration failed. Please check details.");
    }
  };

  const STEPS = [
    { n: 1, label: "Owner" },
    { n: 2, label: "Business" },
    { n: 3, label: "Confirm" },
  ];

  return (
    <AuthLayout>
      <div className="w-full">
        {step < 4 && (
          <>
            <div className="mb-5">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-brand-600 mb-3">
                <span className="h-1 w-1 rounded-full bg-brand-600" />
                Get started free
              </span>
              <h1 className="text-[26px] leading-tight font-bold tracking-tight text-text-primary">
                {step === 1 && "Create your account"}
                {step === 2 && "Tell us about your business"}
                {step === 3 && "Review & confirm"}
              </h1>
              <p className="text-[13px] text-text-secondary mt-1.5">
                {step === 1 && "A few details and your AI receptionist is live."}
                {step === 2 && "We'll personalise your assistant with this context."}
                {step === 3 && "Double-check everything before we launch your workspace."}
              </p>
            </div>

            <div className="flex items-center gap-2 mb-6">
              {STEPS.map((s, i) => {
                const active = step === s.n;
                const done = step > s.n;
                return (
                  <React.Fragment key={s.n}>
                    <div className="flex items-center gap-2">
                      <div
                        className={`h-6 w-6 rounded-full flex items-center justify-center text-[11px] font-bold transition-all ${
                          done
                            ? "bg-emerald-500 text-white"
                            : active
                              ? "bg-brand-500 text-white ring-4 ring-brand-500/25"
                              : "bg-bg-muted text-text-placeholder"
                        }`}
                      >
                        {done ? (
                          <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5">
                            <path
                              d="M5 13l4 4L19 7"
                              stroke="currentColor"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        ) : (
                          s.n
                        )}
                      </div>
                      <span
                        className={`text-[12px] font-semibold ${active ? "text-text-primary" : done ? "text-text-secondary" : "text-text-placeholder"}`}
                      >
                        {s.label}
                      </span>
                    </div>
                    {i < STEPS.length - 1 && (
                      <div
                        className={`flex-1 h-[2px] rounded-full ${done ? "bg-emerald-500" : "bg-bg-muted"}`}
                      />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </>
        )}

        {step === 1 && (
          <div className="space-y-3.5 animate-in fade-in duration-200">
            <div>
              <label className="block text-[13px] font-semibold text-text-primary mb-1.5">
                Full name
              </label>
              <Input
                type="text"
                placeholder="Rajesh Kumar"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (errors.name) setErrors((p) => ({ ...p, name: "" }));
                }}
                error={errors.name}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-[13px] font-semibold text-text-primary mb-1.5">
                Email address
              </label>
              <Input
                type="email"
                placeholder="rajesh@company.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email) setErrors((p) => ({ ...p, email: "" }));
                }}
                error={errors.email}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-[13px] font-semibold text-text-primary mb-1.5">
                Mobile number
              </label>
              <Input
                type="tel"
                placeholder="+919876543210"
                value={phone}
                onChange={(e) => {
                  let val = e.target.value;
                  if (!val.startsWith("+91")) val = "+91" + val.replace(/^\+?9?1?/, "");
                  setPhone(val);
                  if (errors.phone) setErrors((p) => ({ ...p, phone: "" }));
                }}
                error={errors.phone}
                className={inputClass}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[13px] font-semibold text-text-primary mb-1.5">
                  Password
                </label>
                <Input
                  type="password"
                  placeholder="8+ characters"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errors.password) setErrors((p) => ({ ...p, password: "" }));
                  }}
                  error={errors.password}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-[13px] font-semibold text-text-primary mb-1.5">
                  Confirm
                </label>
                <Input
                  type="password"
                  placeholder="Repeat password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (errors.confirmPassword) setErrors((p) => ({ ...p, confirmPassword: "" }));
                  }}
                  error={errors.confirmPassword}
                  className={inputClass}
                />
              </div>
            </div>

            <Button
              type="button"
              variant="primary"
              className={`w-full h-11 mt-2 ${primaryButton}`}
              onClick={handleNextStep}
            >
              Continue →
            </Button>

            <div className="mt-3 text-center text-[13px] text-text-secondary">
              Already have an account?{" "}
              <Link
                to="/login"
                className="text-text-primary font-bold hover:text-brand-600 transition-colors"
              >
                Sign in
              </Link>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3.5 animate-in fade-in duration-200">
            <div>
              <label className="block text-[13px] font-semibold text-text-primary mb-1.5">
                Business name
              </label>
              <Input
                type="text"
                placeholder="Rajesh Distributors"
                value={businessName}
                onChange={(e) => {
                  setBusinessName(e.target.value);
                  if (errors.businessName) setErrors((p) => ({ ...p, businessName: "" }));
                }}
                error={errors.businessName}
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-[13px] font-semibold text-text-primary mb-1.5">
                Business type
              </label>
              <div className="relative">
                <select
                  value={businessType}
                  onChange={(e) => setBusinessType(e.target.value)}
                  className={`${inputClass} appearance-none pr-9 cursor-pointer`}
                >
                  <option value="retail">Retail Store</option>
                  <option value="real_estate">Real Estate</option>
                  <option value="garage">Garage / Repair</option>
                  <option value="ecommerce">E-commerce</option>
                  <option value="other">Other</option>
                </select>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary"
                >
                  <path
                    d="M6 9l6 6 6-6"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </div>

            <div>
              <label className="block text-[13px] font-semibold text-text-primary mb-1.5">
                Website URL <span className="text-text-placeholder font-normal">(optional)</span>
              </label>
              <Input
                type="text"
                placeholder="https://example.com"
                value={websiteUrl}
                onChange={(e) => {
                  setWebsiteUrl(e.target.value);
                  if (errors.websiteUrl) setErrors((p) => ({ ...p, websiteUrl: "" }));
                }}
                error={errors.websiteUrl}
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-[13px] font-semibold text-text-primary mb-1.5">
                Team size
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { value: "SOLO", label: "Just me" },
                  { value: "SMALL", label: "2 – 5" },
                  { value: "MEDIUM", label: "6 – 20" },
                  { value: "LARGE", label: "20+" },
                ].map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setTeamSize(item.value)}
                    className={`flex items-center justify-center px-2 rounded-[10px] border text-[12px] font-semibold transition-all h-10 ${
                      teamSize === item.value
                        ? "border-amber-500 bg-amber-50 text-brand-700"
                        : "border-border bg-bg-raised text-text-secondary hover:text-text-primary hover:border-line-strong"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3 mt-4">
              <Button
                type="button"
                variant="secondary"
                className={`w-1/3 h-11 ${ghostButton}`}
                onClick={handlePrevStep}
              >
                Back
              </Button>
              <Button
                type="button"
                variant="primary"
                className={`w-2/3 h-11 ${primaryButton}`}
                onClick={handleNextStep}
              >
                Continue →
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <form onSubmit={handleSubmit} className="space-y-4 animate-in fade-in duration-200">
            {formError && (
              <div className="rounded-[10px] bg-rose-50 border border-rose-200 p-3.5 text-[13px] text-rose-700 font-medium flex items-start gap-2.5">
                <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 mt-0.5 shrink-0">
                  <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
                  <path
                    d="M12 8v5M12 16.5v.5"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                </svg>
                <span>{formError}</span>
              </div>
            )}

            <div className="rounded-[12px] border border-border bg-bg-subtle p-4 space-y-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-brand-600">
                  Owner
                </span>
                <p className="text-[14px] text-text-primary font-semibold mt-1">{name}</p>
                <p className="text-[12.5px] text-text-secondary mt-0.5">
                  {email} · {phone}
                </p>
              </div>
              <div className="border-t border-line-default pt-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-brand-600">
                  Business
                </span>
                <p className="text-[14px] text-text-primary font-semibold mt-1">{businessName}</p>
                <p className="text-[12.5px] text-text-secondary mt-0.5 capitalize">
                  {businessType.replace("_", " ")} · {teamSize.toLowerCase()} team
                </p>
                {websiteUrl && (
                  <p className="text-[12.5px] text-brand-600 truncate mt-1">{websiteUrl}</p>
                )}
              </div>
            </div>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={agreeTerms}
                onChange={(e) => {
                  setAgreeTerms(e.target.checked);
                  if (formError) setFormError("");
                }}
                className="mt-0.5 h-4 w-4 rounded border-border text-amber-500 focus:ring-2 focus:ring-amber-500/25 cursor-pointer"
              />
              <span className="text-[12.5px] text-text-secondary leading-relaxed select-none">
                I agree to the{" "}
                <span className="text-text-primary font-semibold hover:text-brand-600 transition-colors">
                  Terms of Service
                </span>{" "}
                &{" "}
                <span className="text-text-primary font-semibold hover:text-brand-600 transition-colors">
                  Privacy Policy
                </span>
                .
              </span>
            </label>

            <div className="flex gap-3 pt-1">
              <Button
                type="button"
                variant="secondary"
                className={`w-1/3 h-11 ${ghostButton}`}
                onClick={handlePrevStep}
                disabled={isLoading}
              >
                Back
              </Button>
              <Button
                type="submit"
                variant="primary"
                className={`w-2/3 h-11 ${primaryButton}`}
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    Creating workspace…
                  </span>
                ) : (
                  <>Create account →</>
                )}
              </Button>
            </div>
          </form>
        )}

        {step === 4 && (
          <div className="text-center py-6 animate-in fade-in duration-300">
            <div className="mx-auto relative flex h-16 w-16 items-center justify-center mb-6">
              <div className="absolute inset-0 rounded-full bg-emerald-400/20 animate-ping" />
              <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-[0_10px_30px_-8px_rgba(16,185,129,0.6)]">
                <svg
                  className="h-7 w-7"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            <h2 className="text-[24px] font-bold text-text-primary mb-2 tracking-tight">
              Welcome to DeskBuddy, {name.split(" ")[0]}!
            </h2>
            <p className="text-[13.5px] text-text-secondary leading-relaxed max-w-sm mx-auto mb-8">
              Your business workspace is ready and your AI receptionist is being configured right
              now.
            </p>
            <Button
              type="button"
              variant="primary"
              className={`w-full h-11 ${primaryButton}`}
              onClick={() => navigate("/dashboard")}
            >
              Go to dashboard →
            </Button>
          </div>
        )}
      </div>
    </AuthLayout>
  );
}
export default Register;
