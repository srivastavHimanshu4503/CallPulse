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
  | { product: "phone-number"; agentId: string; phoneNumber: string; country?: "US" | "IN" };

/** Distinguish "payment never happened" from "payment ok but provisioning failed". */
export interface CheckoutErrorInfo {
  message: string;
  /** Razorpay payment reference — only present if the payment DID happen. */
  paymentId?: string;
  /** True once the payment was successfully captured but fulfilment failed. */
  paid: boolean;
}

/**
 * One hook for every purchase: opens Razorpay Checkout for the given
 * product, verifies the payment server-side, and refreshes entitlements +
 * credit history so the whole app updates instantly.
 *
 * `onError` fires when payment SUCCEEDS but provisioning fails (e.g. Plivo
 * number no longer available) — caller should display a persistent alert
 * showing the paymentId so the user can request a refund.
 */
export function useRazorpayCheckout() {
  const queryClient = useQueryClient();
  const [isPaying, setIsPaying] = React.useState(false);

  const checkout = React.useCallback(
    async (
      body: CheckoutProduct,
      description: string,
      onSuccess?: () => void,
      onError?: (info: CheckoutErrorInfo) => void,
    ) => {
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
            const paymentId = response?.razorpay_payment_id as string | undefined;
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
              const message =
                err?.response?.data?.error ||
                "Payment verified but provisioning failed — contact support.";
              // Persistent toast + explicit onError so the caller can show
              // the paymentId in-place (crucial: user paid, so they need
              // proof for a refund request).
              toast.error(message, {
                description: paymentId ? `Payment ref: ${paymentId}` : undefined,
                duration: 15_000,
              });
              onError?.({ message, paymentId, paid: true });
            }
          },
          modal: { ondismiss: () => setIsPaying(false) },
        });
        rzp.open();
      } catch (err: any) {
        const message = err?.response?.data?.error || err.message || "Couldn't start checkout";
        toast.error(message);
        onError?.({ message, paid: false });
      } finally {
        setIsPaying(false);
      }
    },
    [queryClient],
  );

  return { checkout, isPaying };
}
