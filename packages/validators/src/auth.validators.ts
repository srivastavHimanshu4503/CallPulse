import { z } from "zod";

// Phone validation pattern matching +91 followed by exactly 10 digits
const indianPhoneRegex = /^\+91[6789]\d{9}$/;

export const loginSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
  password: z.string().min(8, { message: "Password must be at least 8 characters" }),
  businessSlug: z.string().optional(),
});

export const registerSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters" }),
  email: z.string().email({ message: "Invalid email address" }),
  password: z.string().min(8, { message: "Password must be at least 8 characters" }),
  phone: z.string().regex(indianPhoneRegex, {
    message: "Phone number must be in Indian format (+91XXXXXXXXXX)",
  }),
  businessName: z.string().min(2, { message: "Business name must be at least 2 characters" }),
  businessType: z.enum(["retail", "real_estate", "garage", "ecommerce", "other"], {
    errorMap: () => ({ message: "Invalid business type" }),
  }),
  websiteUrl: z.string().url({ message: "Invalid website URL" }).or(z.literal("")).optional(),
  teamSize: z.enum(["SOLO", "SMALL", "MEDIUM", "LARGE"]).optional(),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
});

export const resetPasswordSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
  otp: z.string().length(6, { message: "OTP must be exactly 6 digits" }),
  newPassword: z.string().min(8, { message: "Password must be at least 8 characters" }),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1, { message: "Refresh token is required" }),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;

