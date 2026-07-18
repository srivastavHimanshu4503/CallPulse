import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/axios.js";
import type { Entitlements, FeatureKey } from "@antigravity/types";

const FREE_DEFAULT: Entitlements = {
  plan: "FREE",
  creditBalance: 0,
  features: {
    CONTACT_DETAILS: false,
    WEBSITE_WIDGET: false,
    ANALYTICS_PAGE: false,
    WORKFLOW_ACTIVATION: false,
    PHONE_NUMBER_PURCHASE: false,
  },
};

/**
 * The tenant's plan, credit balance, and unlocked features. Cached for the
 * session; every gate in the UI reads from here so plan changes propagate
 * everywhere at once. NOTE: this is UX-only — the API enforces every gate
 * server-side too.
 */
export function useEntitlements() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["entitlements"],
    queryFn: async () => (await api.get("/billing/entitlements")).data.data as Entitlements,
    staleTime: 60_000,
  });

  const entitlements = data ?? FREE_DEFAULT;
  return {
    ...entitlements,
    isLoading,
    refetch,
    can: (feature: FeatureKey): boolean => entitlements.features[feature] === true,
  };
}
