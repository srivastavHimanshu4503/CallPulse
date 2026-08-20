// Helper to format ISO dates into friendly relative time
export function formatTimeAgo(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);

    if (diffSec < 10) return "Just now";
    if (diffSec < 60) return `${diffSec}s ago`;

    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;

    const diffHrs = Math.floor(diffMin / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;

    const diffDays = Math.floor(diffHrs / 24);
    return `${diffDays}d ago`;
  } catch {
    return "Recently";
  }
}

// Format currency values into standard Indian numbering system format (INR)
export function formatINR(val: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(val);
}

// Helper to slugify business name and append a random 4-character suffix
export function generateBusinessSlug(businessName: string): string {
  const clean = businessName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  const suffix = Math.random().toString(36).substring(2, 6);
  return `${clean}-${suffix}`;
}

// Helper to filter raw database/Prisma constraints out, presenting clean text responses to the user
export function getCleanErrorMessage(error: unknown): string {
  if (!error) return "An unexpected error occurred";

  const msg =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : (error as Record<string, any>)?.message || "";

  // Clean up database unique constraint violations
  if (msg.includes("Unique constraint failed") || msg.includes("P2002")) {
    if (msg.includes("email")) {
      return "This email address is already in use by another workspace.";
    }
    if (msg.includes("phoneNumber") || msg.includes("phone_numbers")) {
      return "This phone number is already registered to another workspace.";
    }
    if (msg.includes("slug") || msg.includes("Tenant")) {
      return "A business with this exact name already exists. Please try a different name.";
    }
    return "A record with these unique details already exists.";
  }

  // Clean up database foreign key constraint violations
  if (msg.includes("Foreign key constraint violated") || msg.includes("P2003")) {
    return "An integrity security check failed. Please ensure all related settings are valid.";
  }

  // If it's a Prisma error, don't expose stack details to the user
  if (
    msg.includes("PrismaClient") ||
    msg.includes("invocation in") ||
    msg.includes("Prisma Client")
  ) {
    return "A database operation error occurred. Please contact our support team.";
  }

  return msg || "An unexpected error occurred";
}

// Helper to format activity summaries by replacing Unix timestamp values with formatted dates
export function formatActivitySummary(summary: string): string {
  if (!summary) return "";

  return summary
    .replace(/"(\d{10})"/g, (match, p1) => {
      const timestamp = parseInt(p1, 10);
      if (timestamp > 1500000000 && timestamp < 2100000000) {
        try {
          const dateObj = new Date(timestamp * 1000);
          return `"${dateObj.toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}"`;
        } catch {
          return match;
        }
      }
      return match;
    })
    .replace(/\b(\d{10})\b/g, (match) => {
      const timestamp = parseInt(match, 10);
      if (timestamp > 1500000000 && timestamp < 2100000000) {
        try {
          const dateObj = new Date(timestamp * 1000);
          return dateObj.toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          });
        } catch {
          return match;
        }
      }
      return match;
    });
}

export * from "./date.js";
export * from "./crypto.js";
