import { NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-paystack-signature");
    const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;

    // Verify webhook signature if secret key is present
    if (paystackSecretKey && !paystackSecretKey.includes("placeholder")) {
      const hash = crypto
        .createHmac("sha512", paystackSecretKey)
        .update(rawBody)
        .digest("hex");

      if (hash !== signature) {
        console.error("Invalid Paystack webhook signature");
        return NextResponse.json(
          { error: "Invalid signature" },
          { status: 401 }
        );
      }
    }

    const event = JSON.parse(rawBody);

    // Handle charge.success or subscription.create
    if (event.event === "charge.success") {
      const data = event.data;
      const metadata = data.metadata || {};
      const coupleId = metadata.couple_id;
      const planType = metadata.plan_type || "monthly";

      if (coupleId) {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseServiceKey =
          process.env.SUPABASE_SERVICE_ROLE_KEY ||
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

        const expiresAt =
          planType === "yearly"
            ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
            : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

        const { error } = await supabaseAdmin.from("subscriptions").upsert(
          {
            couple_id: coupleId,
            status: "premium",
            plan_type: planType,
            paystack_reference: data.reference,
            paystack_customer_id: data.customer?.customer_code || null,
            paystack_subscription_code: data.plan || null,
            expires_at: expiresAt,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "couple_id" }
        );

        if (error) {
          console.error("Failed to update couple subscription on webhook:", error);
          return NextResponse.json(
            { error: "Database error updating subscription" },
            { status: 500 }
          );
        }

        console.log(`[Paystack Webhook] Couple ${coupleId} upgraded to Premium until ${expiresAt}`);
      }
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (err: any) {
    console.error("Paystack webhook error:", err);
    return NextResponse.json(
      { error: err.message || "Webhook processing failed" },
      { status: 500 }
    );
  }
}
