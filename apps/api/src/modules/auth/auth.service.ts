import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { db } from "../../config/database.js";
import { env } from "../../config/env.js";
import { generateTokens } from "../../utils/auth.helpers.js";
import { generateBusinessSlug } from "@antigravity/utils";
import type { RegisterInput, LoginInput, ResetPasswordInput } from "@antigravity/validators";
import type { AuthResponseData, AuthTokens } from "@antigravity/types";

export class AuthService {
  async register(data: RegisterInput): Promise<AuthResponseData> {
    const { name, email, password, phone, businessName, businessType, websiteUrl, teamSize } = data;

    // 1. Check if email is already registered globally
    const existingUser = await db.user.findFirst({
      where: { email },
    });

    if (existingUser) {
      throw new Error("Email address is already registered");
    }

    // 2. Hash password with bcrypt (rounds: 12)
    const passwordHash = await bcrypt.hash(password, 12);

    // 3. Generate unique business slug
    const slug = generateBusinessSlug(businessName);

    // 4. Create Tenant, User, and default AI Agent inside a database transaction to ensure Atomicity
    const result = await db.$transaction(async (tx: Parameters<Parameters<typeof db.$transaction>[0]>[0]) => {
      // Create Tenant
      const tenant = await tx.tenant.create({
        data: {
          name: businessName,
          slug,
          businessType,
          websiteUrl: websiteUrl || null,
          teamSize: teamSize || "SOLO",
          onboardingStep: 1,
          onboardingDone: false,
        },
      });

      // Create User as OWNER
      const user = await tx.user.create({
        data: {
          tenantId: tenant.id,
          email,
          passwordHash,
          name,
          role: "OWNER",
        },
      });

      // Create primary PhoneNumber record for the Tenant
      await tx.phoneNumber.create({
        data: {
          tenantId: tenant.id,
          phoneNumber: phone,
          label: "Primary Business Line",
        },
      });

      // Create a default AI Agent for the new Tenant
      const aiAgent = await tx.aIAgent.create({
        data: {
          tenantId: tenant.id,
          name: `${businessName} AI Assistant`,
          systemPrompt: `You are a helpful customer support assistant representing ${businessName}. Address clients politely and assist them with their inquiries.`,
          modelName: "gemini-2.5-flash",
        },
      });

      // Create a KnowledgeBase entry if websiteUrl is provided
      if (websiteUrl) {
        await tx.knowledgeBase.create({
          data: {
            tenantId: tenant.id,
            agentId: aiAgent.id,
            name: `${businessName} Website Knowledge`,
            content: `Scraping pending for: ${websiteUrl}`,
          },
        });
      }

      return { tenant, user };
    });

    // 5. Generate tokens
    const tokens = generateTokens(
      result.user.id,
      result.tenant.id,
      result.user.email,
      result.user.name,
      result.user.role
    );

    return {
      user: {
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
        role: result.user.role,
      },
      tenant: {
        id: result.tenant.id,
        name: result.tenant.name,
        slug: result.tenant.slug,
        plan: result.tenant.plan,
      },
      tokens,
    };
  }

  async login(data: LoginInput): Promise<AuthResponseData> {
    const { email, password, businessSlug } = data;

    // 1. Find user by email
    const user = await db.user.findFirst({
      where: {
        email,
        deletedAt: null,
      },
      include: {
        tenant: true,
      },
    });

    if (!user) {
      throw new Error("Invalid email or password");
    }

    // If businessSlug is provided, verify match
    if (businessSlug && user.tenant.slug !== businessSlug) {
      throw new Error("Invalid email or password for this business slug");
    }

    // 2. Verify password with bcrypt
    const isPasswordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordMatch) {
      throw new Error("Invalid email or password");
    }

    // 3. Generate tokens
    const tokens = generateTokens(
      user.id,
      user.tenantId,
      user.email,
      user.name,
      user.role
    );

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      tenant: {
        id: user.tenant.id,
        name: user.tenant.name,
        slug: user.tenant.slug,
        plan: user.tenant.plan,
      },
      tokens,
    };
  }

  async refresh(refreshToken: string): Promise<AuthTokens> {
    try {
      // 1. Verify refresh token
      const decoded = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as {
        userId: string;
        tenantId: string;
        email: string;
        name: string;
        role: string;
      };

      // 2. Double check user still exists and is not deleted
      const user = await db.user.findFirst({
        where: {
          id: decoded.userId,
          tenantId: decoded.tenantId,
          deletedAt: null,
        },
      });

      if (!user) {
        throw new Error("User no longer exists");
      }

      // 3. Generate fresh token pair
      return generateTokens(
        user.id,
        user.tenantId,
        user.email,
        user.name,
        user.role
      );
    } catch (error) {
      throw new Error("Invalid or expired refresh token");
    }
  }

  async forgotPassword(email: string): Promise<{ message: string; otp: string }> {
    // 1. Find user by email
    const user = await db.user.findFirst({
      where: {
        email,
        deletedAt: null,
      },
    });

    if (!user) {
      // To prevent email enumeration in real production, we might say "OTP sent"
      // but the user specs say: "Find user by email, generate OTP, return OTP in response (dev mode)"
      throw new Error("No user registered with this email address");
    }

    // 2. Generate 6-digit numeric OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // 3. Store OTP in DB with 15-minute expiration
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes from now

    // Invalidate existing OTPs for the user to be secure
    await db.passwordResetOtp.updateMany({
      where: {
        userId: user.id,
        used: false,
      },
      data: {
        used: true,
      },
    });

    await db.passwordResetOtp.create({
      data: {
        userId: user.id,
        otp,
        expiresAt,
      },
    });

    return {
      message: "OTP sent successfully",
      otp, // Dev mode requirement
    };
  }

  async resetPassword(data: ResetPasswordInput): Promise<boolean> {
    const { email, otp, newPassword } = data;

    // 1. Find user by email
    const user = await db.user.findFirst({
      where: {
        email,
        deletedAt: null,
      },
    });

    if (!user) {
      throw new Error("User not found");
    }

    // 2. Find and verify OTP
    const storedOtp = await db.passwordResetOtp.findFirst({
      where: {
        userId: user.id,
        otp,
        used: false,
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    if (!storedOtp) {
      throw new Error("Invalid or expired OTP verification code");
    }

    // Mark OTP as used
    await db.passwordResetOtp.update({
      where: {
        id: storedOtp.id,
      },
      data: {
        used: true,
      },
    });

    // 3. Hash new password with 12 rounds of bcrypt
    const passwordHash = await bcrypt.hash(newPassword, 12);

    // 4. Update user's password
    await db.user.update({
      where: {
        id: user.id,
      },
      data: {
        passwordHash,
      },
    });

    return true;
  }

  async me(userId: string, tenantId: string): Promise<{ user: any; tenant: any }> {
    const user = await db.user.findFirst({
      where: {
        id: userId,
        tenantId,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    if (!user) {
      throw new Error("User context no longer exists");
    }

    const tenant = await db.tenant.findFirst({
      where: {
        id: tenantId,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        plan: true,
      },
    });

    if (!tenant) {
      throw new Error("Tenant context no longer exists");
    }

    return { user, tenant };
  }
}
