import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { couple_id, user_id, plan_type = "monthly", email, currency: clientCurrency } = body;

    if (!couple_id) {
      return NextResponse.json(
        { error: "couple_id is required" },
        { status: 400 }
      );
    }

    const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;
    // Default to NGN because the Paystack merchant account is registered in Nigeria
    const targetCurrency = clientCurrency || process.env.PAYSTACK_CURRENCY || "NGN";

    // Amounts in sub-units (cents for USD, kobo for NGN)
    // Monthly: ₦7,990 (799,000 kobo) / $7.99 (799 cents)
    // Yearly: ₦49,000 (4,900,000 kobo) / $49.00 (4,900 cents)
    const getSubUnits = (curr: string, plan: string) => {
      if (curr.toUpperCase() === "NGN") {
        return plan === "yearly" ? 4900000 : 799000;
      }
      return plan === "yearly" ? 4900 : 799;
    };

    const origin = req.headers.get("origin") || "http://localhost:3000";
    const callback_url = `${origin}/pricing?payment=success&plan=${plan_type}`;

    // If Paystack Secret Key is configured, call Paystack REST API
    if (paystackSecretKey && !paystackSecretKey.includes("placeholder")) {
      const initCall = async (curr?: string) => {
        const payload: Record<string, any> = {
          email: email || "customer@christone.app",
          amount: getSubUnits(curr || targetCurrency, plan_type),
          metadata: {
            couple_id,
            user_id,
            plan_type,
            app: "christone-couples",
          },
          callback_url,
        };

        if (curr) {
          payload.currency = curr;
        }

        const res = await fetch("https://api.paystack.co/transaction/initialize", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${paystackSecretKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        return res.json();
      };

      // 1. Try with the requested currency
      let paystackData = await initCall(targetCurrency);

      // 2. If currency is not supported by this merchant account (e.g. USD requested on NGN-only merchant account), auto-fallback to NGN
      if (!paystackData.status && paystackData.message?.toLowerCase().includes("currency")) {
        console.warn(`[Paystack Checkout] Currency ${targetCurrency} not supported by merchant. Retrying with NGN fallback...`);
        paystackData = await initCall("NGN");
      }

      // 3. If still not working, try without currency field (Paystack uses merchant's default account currency)
      if (!paystackData.status && paystackData.message?.toLowerCase().includes("currency")) {
        console.warn("[Paystack Checkout] Retrying without explicit currency to use merchant default currency...");
        paystackData = await initCall(undefined);
      }

      if (!paystackData.status) {
        console.error("Paystack API error:", paystackData);
        return NextResponse.json(
          { error: paystackData.message || "Failed to initialize Paystack checkout" },
          { status: 502 }
        );
      }

      return NextResponse.json({
        authorization_url: paystackData.data.authorization_url,
        access_code: paystackData.data.access_code,
        reference: paystackData.data.reference,
      });
    }

    // TEST / DEMO FALLBACK:
    // If no PAYSTACK_SECRET_KEY is configured, allow instant test activation
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
        "Test Mode: Upgraded couple to Premium for testing.",
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
