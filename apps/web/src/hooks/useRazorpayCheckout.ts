import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "../lib/axios.js";

/** Load Razorpay's Checkout.js once, on demand. */
const loadScript = (): Promise<boolean> =>
  new Promise((resolve) => {
    if ((window as any).Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

export type CheckoutProduct =
  | { product: "pro" }
  | { product: "credits"; packId: string }
  | { product: "phone-number"; agentId: string; phoneNumber: string };

/**
 * One hook for every purchase: opens Razorpay Checkout for the given
 * product, verifies the payment server-side, and refreshes entitlements +
 * credit history so the whole app updates instantly.
 */
export function useRazorpayCheckout() {
  const queryClient = useQueryClient();
  const [isPaying, setIsPaying] = React.useState(false);

  const checkout = React.useCallback(
    async (body: CheckoutProduct, description: string, onSuccess?: () => void) => {
      setIsPaying(true);
      try {
        const loaded = await loadScript();
        if (!loaded) throw new Error("Couldn't load the payment window — check your connection");

        const session = (await api.post("/billing/checkout", body)).data.data as {
          keyId: string;
          orderId: string;
          amount: number;
          currency: string;
        };

        const rzp = new (window as any).Razorpay({
          key: session.keyId,
          order_id: session.orderId,
          amount: session.amount,
          currency: session.currency,
          name: "DeskBuddy",
          description,
          theme: { color: "#2563EB" },
          handler: async (response: any) => {
            try {
              await api.post("/billing/verify", response);
              await queryClient.invalidateQueries({ queryKey: ["entitlements"] });
              await queryClient.invalidateQueries({ queryKey: ["credit-ledger"] });
              toast.success(
                body.product === "pro"
                  ? "Welcome to Pro! Your credits have been added."
                  : body.product === "phone-number"
                    ? "Number purchased and attached to your agent!"
                    : "Credits added to your balance.",
              );
              onSuccess?.();
            } catch (err: any) {
              toast.error(
                err?.response?.data?.error || "Payment verification failed — contact support",
              );
            }
          },
          modal: { ondismiss: () => setIsPaying(false) },
        });
        rzp.open();
      } catch (err: any) {
        toast.error(err?.response?.data?.error || err.message || "Couldn't start checkout");
      } finally {
        setIsPaying(false);
      }
    },
    [queryClient],
  );

  return { checkout, isPaying };
}
