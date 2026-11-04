"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { Check, Sparkles, ShieldCheck, HelpCircle, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { supabase } from "@/lib/supabase/client";
import { getCoupleSubscription, type SubscriptionStatus } from "@/lib/subscription";

export default function PricingPage() {
  const [selectedPlan, setSelectedPlan] = React.useState<"monthly" | "yearly">("yearly");
  const [subStatus, setSubStatus] = React.useState<SubscriptionStatus | null>(null);
  const [coupleId, setCoupleId] = React.useState<string | null>(null);
  const [userId, setUserId] = React.useState<string | null>(null);
  const [userEmail, setUserEmail] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [notification, setNotification] = React.useState<string | null>(null);

  React.useEffect(() => {
    async function loadData() {
      try {
        const { data: authData } = await supabase.auth.getUser();
        const user = authData?.user;
        if (!user) return;
        setUserId(user.id);
        setUserEmail(user.email || null);

        const { data: couple } = await supabase
          .from("couples")
          .select("id")
          .or(`partner_a.eq.${user.id},partner_b.eq.${user.id}`)
          .maybeSingle();

        if (couple) {
          setCoupleId(couple.id);
          const status = await getCoupleSubscription(couple.id);
          setSubStatus(status);
        }

        // Check if redirected after payment success
        if (typeof window !== "undefined") {
          const urlParams = new URLSearchParams(window.location.search);
          if (urlParams.get("payment") === "success") {
            setNotification("Hallelujah! Your couple space is now upgraded to Premium.");
          }
        }
      } catch (err) {
        console.error("Failed to load subscription info:", err);
      }
    }

    loadData();
  }, []);

  const handleUpgrade = async () => {
    if (!coupleId) {
      alert("Please ensure your couple account is linked first.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          couple_id: coupleId,
          user_id: userId,
          email: userEmail || "partner@christone.app",
          plan_type: selectedPlan,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to initialize Paystack checkout");
      }

      if (data.authorization_url) {
        window.location.href = data.authorization_url;
      } else if (data.status === "success" && data.simulated) {
        setNotification("Test Mode: Premium subscription activated for both of you!");
        if (coupleId) {
          const updated = await getCoupleSubscription(coupleId);
          setSubStatus(updated);
        }
      }
    } catch (err: any) {
      console.error("Paystack upgrade error:", err);
      alert(err.message || "Failed to initiate payment. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const isCurrentPremium = subStatus?.isPremium;

  return (
    <div className="space-y-10 pb-20 pt-2">
      {/* Page Header (Max 6 words headline) */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-[#FFC2CE]/40 border border-primary/20 text-xs font-semibold text-primary">
          <Sparkles size={13} />
          <span>One Price Covers Both</span>
        </div>
        <h1 className="font-heading text-3xl sm:text-4xl text-ink font-normal">
          One membership covers you both
        </h1>
        <p className="text-xs sm:text-sm text-inkSoft max-w-sm mx-auto">
          No separate accounts or fees. When one partners subscribes, your entire private space unlocks.
        </p>
      </div>

      {notification && (
        <div className="p-4 rounded-[20px] bg-[#DDF2E6] border border-[#BCE7CE] text-[#2C6E49] text-xs font-medium text-center">
          {notification}
        </div>
      )}

      {/* Plan Frequency Toggle */}
      <div className="flex justify-center">
        <div className="grid grid-cols-2 p-1 bg-white rounded-full border border-border shadow-[0_4px_16px_rgba(255,90,126,0.06)] w-full max-w-[280px]">
          <button
            type="button"
            onClick={() => setSelectedPlan("monthly")}
            className={`py-2 px-4 rounded-full text-xs font-medium transition-all ${
              selectedPlan === "monthly"
                ? "bg-primary text-white shadow-sm"
                : "text-inkSoft hover:text-ink"
            }`}
          >
            Monthly ($7.99)
          </button>
          <button
            type="button"
            onClick={() => setSelectedPlan("yearly")}
            className={`py-2 px-4 rounded-full text-xs font-medium transition-all flex items-center justify-center space-x-1 ${
              selectedPlan === "yearly"
                ? "bg-primary text-white shadow-sm"
                : "text-inkSoft hover:text-ink"
            }`}
          >
            <span>Yearly ($49)</span>
            <span className="text-[10px] font-bold underline ml-1">Save 48%</span>
          </button>
        </div>
      </div>

      {/* 2 CARDS: FREE VS PREMIUM */}
      <div className="grid grid-cols-1 gap-6">
        {/* CARD 1: FREE */}
        <Card className="rounded-[24px] bg-white border border-border p-6 shadow-[0_8px_32px_rgba(255,90,126,0.06)] space-y-5">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider font-semibold text-inkSoft">
              Free Plan
            </span>
            <span className="text-xs font-medium text-inkSoft px-2.5 py-0.5 rounded-full bg-canvas border border-border">
              Forever
            </span>
          </div>

          <div>
            <div className="font-heading text-3xl text-ink font-normal">$0</div>
            <p className="text-xs text-inkSoft mt-1">Foundation for starting your journey together.</p>
          </div>

          <div className="space-y-2.5 pt-2 border-t border-border/60">
            {[
              "20 talk answers total per couple",
              "1 kingdom game per day",
              "Daily prayer list & 2-min timer",
              "Streak tracker & milestone badges",
              "Private couple space & moments",
            ].map((f, i) => (
              <div key={i} className="flex items-center space-x-2 text-xs text-ink">
                <Check size={14} className="text-primary flex-shrink-0" />
                <span>{f}</span>
              </div>
            ))}
          </div>

          <div className="pt-2">
            <button
              type="button"
              disabled
              className="w-full h-11 rounded-full bg-canvas border border-border text-inkSoft font-medium text-xs cursor-default"
            >
              {!isCurrentPremium ? "Current Plan" : "Included"}
            </button>
          </div>
        </Card>

        {/* CARD 2: PREMIUM */}
        <Card className="rounded-[24px] bg-white border-2 border-primary/30 p-6 shadow-[0_8px_32px_rgba(255,90,126,0.12)] space-y-5 relative overflow-hidden">
          {/* Top highlight bar */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-primary to-blush" />

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Image
                src="/icons/premium-badge.svg"
                alt="Crown"
                width={28}
                height={28}
                className="w-7 h-7"
              />
              <span className="text-xs uppercase tracking-wider font-semibold text-primary">
                Christone Premium
              </span>
            </div>
            <span className="text-[11px] font-semibold text-primary px-3 py-0.5 rounded-full bg-[#FFC2CE]/40">
              Covers Both
            </span>
          </div>

          <div>
            <div className="flex items-baseline space-x-1.5">
              <span className="font-heading text-3xl sm:text-4xl text-ink font-normal">
                {selectedPlan === "yearly" ? "$49" : "$7.99"}
              </span>
              <span className="text-xs text-inkSoft">
                {selectedPlan === "yearly" ? "/year" : "/month"}
              </span>
            </div>
            <p className="text-xs text-primary font-medium mt-1">
              $7.99/mo or $49/year - covers both
            </p>
          </div>

          <div className="space-y-2.5 pt-2 border-t border-border/60">
            {[
              "All 120+ talks & future deck releases",
              "Unlimited games everyday (no daily cap)",
              "Full covenant history & search",
              "Exclusive Date Night packs",
              "Married Intimacy communication deck",
              "Priority Christian relationship guidance",
            ].map((f, i) => (
              <div key={i} className="flex items-center space-x-2 text-xs text-ink font-medium">
                <div className="w-4 h-4 rounded-full bg-[#DDF2E6] flex items-center justify-center flex-shrink-0 text-[#2C6E49]">
                  <Check size={11} strokeWidth={2.5} />
                </div>
                <span>{f}</span>
              </div>
            ))}
          </div>

          <div className="pt-2 space-y-2">
            <button
              type="button"
              disabled={isLoading || isCurrentPremium}
              onClick={handleUpgrade}
              className="w-full h-12 rounded-full bg-primary hover:bg-deep text-white font-medium text-sm transition-all shadow-[0_8px_32px_rgba(255,90,126,0.18)] active:scale-[0.99] flex items-center justify-center space-x-2"
            >
              {isCurrentPremium ? (
                <span>Active Premium Space</span>
              ) : isLoading ? (
                <span>Connecting to Paystack...</span>
              ) : (
                <>
                  <Sparkles size={16} />
                  <span>Upgrade - Covers Both</span>
                </>
              )}
            </button>
            <p className="text-[11px] text-inkSoft text-center">
              Secured with Paystack. Instant activation for both partners.
            </p>
          </div>
        </Card>
      </div>

      {/* MINIMAL COMPARISON TABLE (No dark pricing table!) */}
      <section className="space-y-3">
        <h3 className="font-heading text-xl text-ink font-normal text-center">
          Compare Features
        </h3>

        <div className="bg-white rounded-[24px] border border-border overflow-hidden shadow-[0_8px_32px_rgba(255,90,126,0.06)]">
          <div className="grid grid-cols-3 p-4 bg-canvas/60 border-b border-border text-xs font-semibold text-ink">
            <span>Feature</span>
            <span className="text-center text-inkSoft">Free</span>
            <span className="text-right text-primary">Premium</span>
          </div>

          {[
            { name: "Talk Prompts", free: "20 Total", premium: "All 120+" },
            { name: "Kingdom Games", free: "1 / Day", premium: "Unlimited" },
            { name: "Daily Prayer & Streaks", free: "Included", premium: "Included" },
            { name: "Shared Couple Feed", free: "Included", premium: "Included" },
            { name: "Covenant History", free: "Recent", premium: "Full Archive" },
            { name: "Date Night Packs", free: "Preview", premium: "Included" },
            { name: "Intimacy Deck (Married)", free: "Locked", premium: "Included" },
          ].map((row, idx) => (
            <div
              key={idx}
              className={`grid grid-cols-3 p-3.5 text-xs items-center ${
                idx % 2 === 1 ? "bg-canvas/30" : "bg-white"
              } ${idx !== 6 ? "border-b border-border/50" : ""}`}
            >
              <span className="font-medium text-ink">{row.name}</span>
              <span className="text-center text-inkSoft">{row.free}</span>
              <span className="text-right font-semibold text-primary">{row.premium}</span>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ (2 LINES) */}
      <section className="bg-white rounded-[24px] border border-border p-6 shadow-[0_8px_32px_rgba(255,90,126,0.06)] space-y-4">
        <div className="flex items-center space-x-2 text-ink">
          <HelpCircle size={18} className="text-primary" />
          <h3 className="font-heading text-lg font-normal">Frequently Asked Questions</h3>
        </div>

        <div className="space-y-3.5 text-xs">
          {/* FAQ 1 */}
          <div className="space-y-1">
            <h4 className="font-semibold text-ink font-body">
              Does one subscription cover both partners?
            </h4>
            <p className="text-inkSoft leading-relaxed font-body">
              Yes. When either of you subscribes, your shared space unlocks premium for both.
            </p>
          </div>

          <div className="h-px bg-border/60" />

          {/* FAQ 2 */}
          <div className="space-y-1">
            <h4 className="font-semibold text-ink font-body">
              Can we cancel or change plans anytime?
            </h4>
            <p className="text-inkSoft leading-relaxed font-body">
              Yes. You can manage or cancel your subscription anytime with zero hassles.
            </p>
          </div>
        </div>
      </section>

      {/* BOTTOM CTA */}
      {!isCurrentPremium && (
        <div className="text-center space-y-3 pt-2">
          <button
            type="button"
            disabled={isLoading}
            onClick={handleUpgrade}
            className="w-full h-12 rounded-full bg-primary hover:bg-deep text-white font-medium text-sm transition-all shadow-[0_8px_32px_rgba(255,90,126,0.18)] active:scale-[0.99] flex items-center justify-center space-x-2"
          >
            <Sparkles size={16} />
            <span>Upgrade - Covers Both</span>
          </button>
          <div className="flex items-center justify-center space-x-1 text-[11px] text-inkSoft">
            <ShieldCheck size={13} className="text-primary" />
            <span>Non-recurring option available. Christ-honoring and private.</span>
          </div>
        </div>
      )}
    </div>
  );
}
