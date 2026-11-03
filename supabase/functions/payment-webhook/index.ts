// Supabase Edge Function: payment-webhook
// Handles Razorpay webhook for payment verification
// Writes payments + warranties rows using service role

import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { crypto } from "https://deno.land/std@0.208.0/crypto/mod.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const RAZORPAY_KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET")!;

async function verifyRazorpaySignature(
  body: string,
  signature: string
): Promise<boolean> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(RAZORPAY_KEY_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signatureBytes = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(body)
  );
  const expectedSignature = Array.from(new Uint8Array(signatureBytes))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return expectedSignature === signature;
}

serve(async (req: Request) => {
  try {
    const body = await req.text();
    const signature = req.headers.get("x-razorpay-signature") ?? "";

    // Verify HMAC signature — reject invalid webhooks immediately
    const isValid = await verifyRazorpaySignature(body, signature);
    if (!isValid) {
      return new Response("Invalid signature", { status: 401 });
    }

    const event = JSON.parse(body);
    const { event: eventType, payload } = event;

    if (eventType === "payment.captured") {
      const payment = payload.payment.entity;
      const bookingId: string = payment.notes?.booking_id;

      if (!bookingId) {
        console.error("No booking_id in payment notes");
        return new Response("Missing booking_id", { status: 400 });
      }

      // Write payment record
      const { error: paymentError } = await supabase.from("payments").upsert({
        booking_id: bookingId,
        amount: payment.amount / 100,  // Razorpay amounts are in paise
        method: "razorpay",
        status: "paid",
        transaction_ref: payment.id,
        gateway_payload: payment,
        paid_at: new Date().toISOString(),
      }, { onConflict: "booking_id" });

      if (paymentError) {
        console.error("Payment insert error:", paymentError);
        throw paymentError;
      }

      // Update booking status to completed
      await supabase
        .from("bookings")
        .update({ status: "completed" })
        .eq("id", bookingId);

      // Create warranty (default 90 days from payment)
      const startsAt = new Date();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 90);

      await supabase.from("warranties").upsert({
        booking_id: bookingId,
        duration_days: 90,
        starts_at: startsAt.toISOString(),
        expires_at: expiresAt.toISOString(),
        terms: "90-day warranty covers the repaired component. Does not cover physical damage or water damage after repair.",
      }, { onConflict: "booking_id" });

      console.log(`Payment processed for booking ${bookingId}`);
    }

    if (eventType === "payment.failed") {
      const payment = payload.payment.entity;
      const bookingId: string = payment.notes?.booking_id;

      if (bookingId) {
        await supabase.from("payments").upsert({
          booking_id: bookingId,
          amount: payment.amount / 100,
          method: "razorpay",
          status: "failed",
          transaction_ref: payment.id,
          gateway_payload: payment,
        }, { onConflict: "booking_id" });
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("payment-webhook error:", err);
    return new Response("Internal error", { status: 500 });
  }
});
