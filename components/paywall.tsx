"use client";

import * as React from "react";
import Image from "next/image";
import { Check, Sparkles, X, ShieldCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase/client";

interface PaywallProps {
  isOpen: boolean;
  onClose: () => void;
  coupleId?: string | null;
  currentUserId?: string | null;
  userEmail?: string | null;
  reason?: "talk_limit" | "game_limit" | "general";
  onUpgraded?: () => void;
}

export function Paywall({
  isOpen,
  onClose,
  coupleId,
  currentUserId,
  userEmail,
  reason,
  onUpgraded,
}: PaywallProps) {
  const [selectedPlan, setSelectedPlan] = React.useState<"monthly" | "yearly">("yearly");
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  if (!isOpen) return null;

  const handleUpgrade = async () => {
    setIsLoading(true);
    setErrorMsg(null);

    try {
      // 1. Get coupleId and email if not provided
      let cId = coupleId;
      let email = userEmail;
      let uId = currentUserId;

      if (!cId || !uId || !email) {
        const { data: authData } = await supabase.auth.getUser();
        const user = authData?.user;
        if (user) {
          uId = user.id;
          email = user.email || "couple@christone.app";
          if (!cId) {
            const { data: couple } = await supabase
              .from("couples")
              .select("id")
              .or(`partner_a.eq.${user.id},partner_b.eq.${user.id}`)
              .maybeSingle();
            if (couple) cId = couple.id;
          }
        }
      }

      if (!cId) {
        setErrorMsg("Unable to locate your couple account. Please sign in again.");
        setIsLoading(false);
        return;
      }

      // 2. Call Paystack checkout endpoint
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          couple_id: cId,
          user_id: uId,
          email: email || "hello@christone.app",
          plan_type: selectedPlan,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to initialize checkout");
      }

      // If simulated / test mode returned authorization URL or simulated success
      if (data.authorization_url) {
        window.location.href = data.authorization_url;
      } else if (data.status === "success" && data.simulated) {
        // Test simulation mode when no Paystack secret key is configured yet
        if (onUpgraded) onUpgraded();
        onClose();
        alert("Test Mode: Premium subscription activated for both of you!");
      }
    } catch (err: any) {
      console.error("Paystack upgrade error:", err);
      setErrorMsg(err.message || "Something went wrong initializing checkout.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 12 }}
          className="relative w-full max-w-[420px] bg-white rounded-[24px] border border-border p-6 sm:p-7 shadow-[0_8px_32px_rgba(255,90,126,0.14)] text-center space-y-5"
        >
          {/* Close X */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-inkSoft hover:text-ink rounded-full transition-colors"
            title="Close"
          >
            <X size={18} strokeWidth={1.5} />
          </button>

          {/* Premium Badge Icon */}
          <div className="mx-auto w-12 h-12 flex items-center justify-center">
            <div className="w-12 h-12 relative flex items-center justify-center rounded-full bg-[#FFC2CE]/40">
              {/* Crown Icon / Badge */}
              <Image
                src="/icons/premium-badge.svg"
                alt="Premium Christone Crown"
                width={48}
                height={48}
                className="w-12 h-12 drop-shadow-sm"
              />
            </div>
          </div>

          {/* Headline EXACT: "Unlock your full story" */}
          <div className="space-y-1">
            <h2 className="font-heading text-2xl sm:text-[26px] text-ink font-normal leading-tight">
              Unlock your full story
            </h2>
            {reason === "talk_limit" && (
              <p className="text-xs text-inkSoft">
                You’ve shared 20 blessed talks! Upgrade to keep going deeper together.
              </p>
            )}
            {reason === "game_limit" && (
              <p className="text-xs text-inkSoft">
                You’ve played your free game for today. Upgrade for unlimited daily plays.
              </p>
            )}
            {!reason && (
              <p className="text-xs text-inkSoft">
                Your private sacred sanctuary for connection, prayer, and play.
              </p>
            )}
          </div>

          {/* Bullets: EXACT list */}
          <div className="bg-canvas rounded-[16px] p-4 text-left space-y-2.5 border border-border/60">
            {[
              "All 120+ talks",
              "Unlimited games",
              "Full history",
              "Date night packs",
            ].map((bullet, idx) => (
              <div key={idx} className="flex items-center space-x-2.5 text-xs text-ink font-medium">
                <div className="w-4 h-4 rounded-full bg-[#DDF2E6] flex items-center justify-center flex-shrink-0 text-[#2C6E49]">
                  <Check size={11} strokeWidth={2.5} />
                </div>
                <span>{bullet}</span>
              </div>
            ))}
          </div>

          {/* Plan Toggle (Monthly vs Yearly) */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-canvas rounded-full border border-border/80">
            <button
              type="button"
              onClick={() => setSelectedPlan("monthly")}
              className={`py-1.5 px-3 rounded-full text-xs font-medium transition-all ${
                selectedPlan === "monthly"
                  ? "bg-white text-ink shadow-sm"
                  : "text-inkSoft hover:text-ink"
              }`}
            >
              $7.99 / month
            </button>
            <button
              type="button"
              onClick={() => setSelectedPlan("yearly")}
              className={`py-1.5 px-3 rounded-full text-xs font-medium transition-all flex items-center justify-center space-x-1 ${
                selectedPlan === "yearly"
                  ? "bg-white text-ink shadow-sm"
                  : "text-inkSoft hover:text-ink"
              }`}
            >
              <span>$49 / year</span>
              <span className="text-[10px] text-primary font-semibold">Save 48%</span>
            </button>
          </div>

          {/* Price EXACT: "$7.99/mo or $49/year - covers both" */}
          <div className="space-y-1">
            <div className="inline-flex items-center px-3.5 py-1 rounded-full bg-[#FFC2CE]/40 border border-primary/20 text-xs font-semibold text-primary">
              $7.99/mo or $49/year - covers both
            </div>
            <div className="flex items-center justify-center space-x-1 text-[11px] text-inkSoft">
              <ShieldCheck size={13} className="text-primary" />
              <span>One membership covers both partners</span>
            </div>
          </div>

          {errorMsg && (
            <p className="text-xs text-red-500 font-medium">{errorMsg}</p>
          )}

          {/* CTA & Secondary Buttons */}
          <div className="space-y-2.5 pt-1">
            {/* CTA EXACT: "Upgrade - Covers Both" */}
            <button
              type="button"
              disabled={isLoading}
              onClick={handleUpgrade}
              className="w-full h-12 rounded-full bg-primary hover:bg-deep text-white font-medium text-sm transition-all shadow-[0_8px_32px_rgba(255,90,126,0.18)] active:scale-[0.99] flex items-center justify-center space-x-2"
            >
              {isLoading ? (
                <span>Connecting to Paystack...</span>
              ) : (
                <>
                  <Sparkles size={16} />
                  <span>Upgrade - Covers Both</span>
                </>
              )}
            </button>

            {/* Secondary button EXACT: "Maybe later" */}
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2 text-xs font-medium text-inkSoft hover:text-ink transition-colors"
            >
              Maybe later
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
