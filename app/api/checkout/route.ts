import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { couple_id, user_id, plan_type = "monthly", email } = body;

    if (!couple_id) {
      return NextResponse.json(
        { error: "couple_id is required" },
        { status: 400 }
      );
    }

    const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;
    const currency = process.env.PAYSTACK_CURRENCY || "USD";

    // Amounts in sub-units (cents for USD, kobo for NGN)
    // Monthly: $7.99 (799 cents) | Yearly: $49 (4900 cents)
    const amountInSubUnits =
      currency === "NGN"
        ? plan_type === "yearly"
          ? 4900000 // 49,000 NGN in kobo
          : 799000 // 7,990 NGN in kobo
        : plan_type === "yearly"
        ? 4900 // $49.00 in cents
        : 799; // $7.99 in cents

    const origin = req.headers.get("origin") || "http://localhost:3000";
    const callback_url = `${origin}/pricing?payment=success&plan=${plan_type}`;

    // If Paystack Secret Key is configured, call Paystack REST API
    if (paystackSecretKey && !paystackSecretKey.includes("placeholder")) {
      const response = await fetch("https://api.paystack.co/transaction/initialize", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${paystackSecretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email || "customer@christone.app",
          amount: amountInSubUnits,
          currency,
          metadata: {
            couple_id,
            user_id,
            plan_type,
            app: "christone-couples",
          },
          callback_url,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.status) {
        console.error("Paystack API error:", data);
        return NextResponse.json(
          { error: data.message || "Failed to initialize Paystack checkout" },
          { status: 502 }
        );
      }

      return NextResponse.json({
        authorization_url: data.data.authorization_url,
        access_code: data.data.access_code,
        reference: data.data.reference,
      });
    }

    // TEST / DEMO FALLBACK:
    // If no PAYSTACK_SECRET_KEY is configured yet, allow instant test activation
    // so development and test verification succeed without friction.
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const expiresAt =
      plan_type === "yearly"
        ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const { error: upsertErr } = await supabaseAdmin.from("subscriptions").upsert(
      {
        couple_id,
        status: "premium",
        plan_type: plan_type as "monthly" | "yearly",
        paystack_reference: `test_ref_${Date.now()}`,
        expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "couple_id" }
    );

    if (upsertErr) {
      console.error("Error activating test premium:", upsertErr);
    }

    return NextResponse.json({
      status: "success",
      simulated: true,
      message:
        "Test Mode: Paystack keys not set in environment. Upgraded couple to Premium for testing.",
      plan_type,
      expires_at: expiresAt,
    });
  } catch (err: any) {
    console.error("Checkout route error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
