// Supabase Edge Function: notify-status-change
// Triggered via DB webhook on repair_status_log INSERT
// Writes to notifications table + fans out to FCM + Web Push

import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!  // service role — never exposed to clients
);

const FCM_SERVER_KEY = Deno.env.get("FCM_SERVER_KEY");
const FCM_URL = "https://fcm.googleapis.com/fcm/send";

// Status → human-readable notification content
const STATUS_MESSAGES: Record<string, { title: string; body: string }> = {
  assigned:          { title: "Technician Assigned! 🔧",       body: "A technician has been assigned to your repair job." },
  diagnosis:         { title: "Diagnosis in Progress 🔍",       body: "Your device is being diagnosed." },
  awaiting_approval: { title: "Quotation Ready! 💰",            body: "Review and approve the repair quotation." },
  in_repair:         { title: "Repair Started! ⚙️",             body: "Your device is being repaired." },
  quality_check:     { title: "Quality Check Underway ✅",       body: "Final quality check before we return your device." },
  completed:         { title: "Repair Complete! 🎉",             body: "Your device is ready. Please proceed to payment." },
  cancelled:         { title: "Booking Cancelled",               body: "Your repair booking has been cancelled." },
};

serve(async (req: Request) => {
  try {
    const payload = await req.json();
    // DB webhook sends: { type: "INSERT", table: "repair_status_log", record: {...} }
    const record = payload.record;

    if (!record || !record.booking_id || !record.status) {
      return new Response("Missing record data", { status: 400 });
    }

    // Fetch the booking to get customer_id and provider_id
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("customer_id, provider_id, provider_profiles(user_id)")
      .eq("id", record.booking_id)
      .single();

    if (bookingError || !booking) {
      console.error("Booking fetch error:", bookingError);
      return new Response("Booking not found", { status: 404 });
    }

    const content = STATUS_MESSAGES[record.status] ?? {
      title: "Repair Update",
      body: `Status updated to: ${record.status}`,
    };

    // Determine who to notify (customer for most events; both for some)
    const recipientIds: string[] = [booking.customer_id];
    if (record.status === "awaiting_approval") {
      // Only customer needs to approve — already in the list
    }

    // Insert notification rows
    const notificationInserts = recipientIds.map((userId: string) => ({
      user_id: userId,
      type: "booking_created",
      title: content.title,
      body: content.body,
      payload: {
        booking_id: record.booking_id,
        status: record.status,
      },
    }));

    await supabase.from("notifications").insert(notificationInserts);

    // Fan out to FCM for each recipient
    if (FCM_SERVER_KEY) {
      for (const userId of recipientIds) {
        const { data: user } = await supabase
          .from("users")
          .select("fcm_token")
          .eq("id", userId)
          .single();

        if (user?.fcm_token) {
          await fetch(FCM_URL, {
            method: "POST",
            headers: {
              "Authorization": `key=${FCM_SERVER_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              to: user.fcm_token,
              notification: {
                title: content.title,
                body: content.body,
              },
              data: {
                booking_id: record.booking_id,
                status: record.status,
              },
            }),
          });
        }
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("notify-status-change error:", err);
    return new Response("Internal error", { status: 500 });
  }
});
