"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Sparkles,
  Heart,
  Shield,
  LogOut,
  Trash2,
  Check,
  ChevronRight,
  AlertTriangle,
  Lock,
  FileText,
  HelpCircle,
  X,
} from "lucide-react";
import { Pill } from "@/components/ui/pill";
import { Card } from "@/components/ui/card";
import { supabase } from "@/lib/supabase/client";
import { getCoupleSubscription, type SubscriptionStatus } from "@/lib/subscription";

export default function SettingsPage() {
  const router = useRouter();

  // Loading & Save states
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [saveSuccess, setSaveSuccess] = React.useState(false);

  // User & Couple state
  const [userId, setUserId] = React.useState<string>("");
  const [coupleId, setCoupleId] = React.useState<string>("");
  const [displayName, setDisplayName] = React.useState<string>("");
  const [partnerId, setPartnerId] = React.useState<string>("");
  const [partnerName, setPartnerName] = React.useState<string>("");
  const [coupleName, setCoupleName] = React.useState<string>("");
  const [stage, setStage] = React.useState<string>("courting");
  const [vision, setVision] = React.useState<string>("");
  const [isMarriedConfirmed, setIsMarriedConfirmed] = React.useState<boolean>(false);
  const [inviteCode, setInviteCode] = React.useState<string>("");

  // Subscription state
  const [subStatus, setSubStatus] = React.useState<SubscriptionStatus | null>(null);

  // Modals
  const [showLeaveModal, setShowLeaveModal] = React.useState(false);
  const [leavingSpace, setLeavingSpace] = React.useState(false);
  const [activeLegalModal, setActiveLegalModal] = React.useState<"privacy" | "terms" | "guidelines" | null>(null);

  // Load profile and couple data
  React.useEffect(() => {
    async function loadData() {
      try {
        const { data: authData } = await supabase.auth.getUser();
        const user = authData?.user;
        if (!user) {
          router.push("/onboarding");
          return;
        }

        setUserId(user.id);

        // Load profile
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .maybeSingle();

        if (profile) {
          setDisplayName(profile.display_name || "");
          if (profile.stage) setStage(profile.stage);
          setIsMarriedConfirmed(Boolean(profile.is_married_confirmed));
        }

        // Load couple
        const { data: couple } = await supabase
          .from("couples")
          .select("*")
          .or(`partner_a.eq.${user.id},partner_b.eq.${user.id}`)
          .maybeSingle();

        if (couple) {
          setCoupleId(couple.id);
          setCoupleName(couple.couple_name || "");
          setVision(couple.vision || "");
          setInviteCode(couple.invite_code || "");
          if (couple.is_married_confirmed !== null) {
            setIsMarriedConfirmed(Boolean(couple.is_married_confirmed));
          }

          const pId = couple.partner_a === user.id ? couple.partner_b : couple.partner_a;
          if (pId) {
            setPartnerId(pId);
            const { data: partnerProfile } = await supabase
              .from("profiles")
              .select("display_name")
              .eq("id", pId)
              .maybeSingle();

            if (partnerProfile?.display_name) {
              setPartnerName(partnerProfile.display_name);
            }
          }

          // Load subscription status
          const sub = await getCoupleSubscription(couple.id);
          setSubStatus(sub);
        }
      } catch (err) {
        console.error("Failed to load settings data:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [router]);

  // Save changes to profiles and couples
  const handleSaveSettings = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!userId) return;

    setSaving(true);
    setSaveSuccess(false);

    try {
      // 1. Update user's profile
      await supabase
        .from("profiles")
        .update({
          display_name: displayName.trim(),
          stage: stage as "courting" | "engaged" | "married",
          is_married_confirmed: isMarriedConfirmed,
        })
        .eq("id", userId);

      // Save local stage cache
      if (typeof window !== "undefined") {
        localStorage.setItem("stage", stage);
        localStorage.setItem("couple_vision", vision.trim());
      }

      // 2. Update couple if exists
      if (coupleId) {
        await supabase
          .from("couples")
          .update({
            couple_name: coupleName.trim(),
            vision: vision.trim(),
            is_married_confirmed: isMarriedConfirmed,
          })
          .eq("id", coupleId);
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error("Failed to save settings:", err);
      alert("Failed to save changes. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // Leave Space (soft delete: sets couples status to separated)
  const handleConfirmLeaveSpace = async () => {
    if (!coupleId) return;

    setLeavingSpace(true);
    try {
      await supabase
        .from("couples")
        .update({ status: "separated" })
        .eq("id", coupleId);

      setShowLeaveModal(false);
      router.push("/invite");
    } catch (err) {
      console.error("Error leaving space:", err);
      alert("Failed to leave space. Please try again.");
    } finally {
      setLeavingSpace(false);
    }
  };

  // Logout
  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      if (typeof window !== "undefined") {
        localStorage.clear();
      }
      router.push("/");
    } catch (err) {
      console.error("Logout error:", err);
      router.push("/");
    }
  };

  const userInitial = displayName ? displayName.charAt(0).toUpperCase() : "Y";
  const partnerInitial = partnerName ? partnerName.charAt(0).toUpperCase() : "P";

  return (
    <div className="min-h-screen bg-canvas text-ink p-4 sm:p-6 max-w-[480px] mx-auto space-y-6 pb-24">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Link
            href="/space"
            className="w-10 h-10 rounded-full bg-white border border-border flex items-center justify-center text-ink hover:text-primary transition-colors shadow-xs"
            title="Back to Space"
          >
            <ArrowLeft size={18} strokeWidth={1.5} />
          </Link>
          <div>
            <Pill>Preferences</Pill>
            <h1 className="font-heading text-2xl sm:text-3xl text-ink font-normal mt-0.5">
              Settings & Privacy
            </h1>
          </div>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="text-xs font-medium text-inkSoft hover:text-deep flex items-center space-x-1 px-3 py-1.5 rounded-full border border-border bg-white shadow-xs transition-colors"
        >
          <LogOut size={13} strokeWidth={1.5} />
          <span>Logout</span>
        </button>
      </div>

      {saveSuccess && (
        <div className="p-3.5 rounded-[16px] bg-[#DDF2E6] border border-[#BCE7CE] text-[#2C6E49] text-xs font-medium flex items-center justify-center space-x-2">
          <Check size={14} strokeWidth={2.5} />
          <span>All settings saved successfully</span>
        </div>
      )}

      {/* 1. OVERLAPPING AVATARS & COUPLE HEADER */}
      <Card className="rounded-[24px] bg-white border border-border p-6 shadow-[0_8px_32px_rgba(255,90,126,0.08)] text-center space-y-4">
        {/* Avatars Overlapping */}
        <div className="flex items-center justify-center">
          <div className="flex items-center -space-x-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 border-2 border-white flex items-center justify-center text-primary font-heading text-2xl shadow-sm z-10">
              {userInitial}
            </div>
            <div className="w-16 h-16 rounded-full bg-[#FFC2CE] border-2 border-white flex items-center justify-center text-deep font-heading text-2xl shadow-sm z-0">
              {partnerInitial}
            </div>
          </div>
        </div>

        <div>
          <h2 className="font-heading text-2xl text-ink font-normal">
            {coupleName || `${displayName || "You"} & ${partnerName || "Partner"}`}
          </h2>
          <p className="text-xs text-inkSoft mt-0.5">
            Private shared sanctuary since {inviteCode ? `code: ${inviteCode}` : "pairing"}
          </p>
        </div>
      </Card>

      {/* FORM: COUPLE & PROFILE SETTINGS */}
      <form onSubmit={handleSaveSettings} className="space-y-6">
        {/* 2. NAMES & IDENTITY */}
        <Card className="rounded-[24px] bg-white border border-border p-5 shadow-[0_8px_32px_rgba(255,90,126,0.06)] space-y-4">
          <span className="text-[11px] font-semibold text-primary uppercase tracking-wider block">
            Names & Identity
          </span>

          {/* Couple Name Edit */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-ink font-body block">
              Couple Name
            </label>
            <input
              type="text"
              value={coupleName}
              onChange={(e) => setCoupleName(e.target.value)}
              placeholder="e.g. Tolu & Sarah"
              className="w-full p-3.5 rounded-[16px] border border-border bg-canvas text-xs text-ink placeholder:text-inkSoft/50 focus:outline-none focus:border-primary transition-colors font-body"
            />
          </div>

          {/* Display Name Edit (Current User) */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-ink font-body block">
              Your Display Name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name"
              className="w-full p-3.5 rounded-[16px] border border-border bg-canvas text-xs text-ink placeholder:text-inkSoft/50 focus:outline-none focus:border-primary transition-colors font-body"
            />
          </div>

          {/* Partner Display Name (Read-only note or info) */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-ink font-body block">
              Partner’s Name
            </label>
            <input
              type="text"
              value={partnerName}
              disabled
              className="w-full p-3.5 rounded-[16px] border border-border/60 bg-canvas/60 text-xs text-inkSoft font-body cursor-not-allowed"
            />
            <p className="text-[11px] text-inkSoft">
              Partner sets their display name on their device.
            </p>
          </div>
        </Card>

        {/* 3. STAGE SELECTOR (Can Change) */}
        <Card className="rounded-[24px] bg-white border border-border p-5 shadow-[0_8px_32px_rgba(255,90,126,0.06)] space-y-3.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-primary uppercase tracking-wider">
              Relationship Season
            </span>
            <span className="text-xs font-medium text-inkSoft capitalize">{stage}</span>
          </div>
          <p className="text-xs text-inkSoft">
            Customize conversation decks and questions tailored to your current covenant season.
          </p>

          <div className="grid grid-cols-3 gap-2 pt-1">
            {[
              { id: "courting", label: "Dating" },
              { id: "engaged", label: "Engaged" },
              { id: "married", label: "Married" },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setStage(item.id)}
                className={`py-2.5 px-3 rounded-[16px] text-xs font-medium transition-all text-center border ${
                  stage === item.id
                    ? "bg-primary text-white border-primary shadow-xs font-semibold"
                    : "bg-canvas text-ink hover:bg-blush/20 border-border"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </Card>

        {/* 4. VISION EDIT ("Our Kingdom Why") */}
        <Card className="rounded-[24px] bg-white border border-border p-5 shadow-[0_8px_32px_rgba(255,90,126,0.06)] space-y-2.5">
          <span className="text-[11px] font-semibold text-primary uppercase tracking-wider block">
            Our Kingdom Why
          </span>
          <p className="text-xs text-inkSoft">
            The foundation of God’s divine purpose for your unity.
          </p>
          <textarea
            value={vision}
            onChange={(e) => setVision(e.target.value)}
            placeholder="Why did God bring you two together?"
            rows={3}
            className="w-full p-3.5 rounded-[16px] border border-border bg-canvas text-xs text-ink placeholder:text-inkSoft/50 focus:outline-none focus:border-primary transition-colors resize-none font-body leading-relaxed"
          />
        </Card>

        {/* 5. MARRIED INTIMACY CONFIRMATION (Toggle / Can Uncheck) */}
        <Card className="rounded-[24px] bg-white border border-border p-5 shadow-[0_8px_32px_rgba(255,90,126,0.06)] space-y-3">
          <div className="flex items-center space-x-2">
            <Lock size={15} className="text-primary flex-shrink-0" />
            <span className="text-[11px] font-semibold text-primary uppercase tracking-wider">
              Married Intimacy Deck Gate
            </span>
          </div>

          <p className="text-xs text-inkSoft leading-relaxed">
            Non-graphic, consent-focused, Christ-honoring communication. 18+, consensual, skippable.
          </p>

          <label className="flex items-start space-x-3 p-3 rounded-[16px] bg-canvas border border-border cursor-pointer select-none hover:bg-blush/10 transition-colors">
            <input
              type="checkbox"
              checked={isMarriedConfirmed}
              onChange={(e) => setIsMarriedConfirmed(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded accent-primary text-primary focus:ring-primary/20"
            />
            <span className="text-xs font-medium text-ink font-body leading-snug">
              We confirm we are married, 18+, and consent to intimacy prompts.
            </span>
          </label>
        </Card>

        {/* SAVE BUTTON */}
        <div>
          <button
            type="submit"
            disabled={saving}
            className="w-full h-12 rounded-full bg-primary hover:bg-deep text-white font-medium text-sm transition-all shadow-[0_8px_32px_rgba(255,90,126,0.18)] active:scale-[0.99] flex items-center justify-center space-x-2"
          >
            {saving ? (
              <span>Saving changes...</span>
            ) : (
              <>
                <Check size={16} strokeWidth={2} />
                <span>Save All Changes</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* 6. BILLING & SUBSCRIPTION LINK TO /pricing */}
      <Card className="rounded-[24px] bg-white border border-border p-5 shadow-[0_8px_32px_rgba(255,90,126,0.06)] space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-full bg-[#FFC2CE]/40 flex items-center justify-center">
              <Image
                src="/icons/premium-badge.svg"
                alt="Crown"
                width={24}
                height={24}
                className="w-6 h-6"
              />
            </div>
            <div>
              <h3 className="font-heading text-lg text-ink font-normal">
                {subStatus?.isPremium ? "Christone Premium" : "Free Plan"}
              </h3>
              <p className="text-xs text-inkSoft">
                {subStatus?.isPremium
                  ? "Unlimited talks, games, and full history"
                  : "$7.99/mo or $49/year - covers both"}
              </p>
            </div>
          </div>
          <span
            className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
              subStatus?.isPremium
                ? "bg-[#DDF2E6] text-[#2C6E49]"
                : "bg-canvas text-inkSoft border border-border"
            }`}
          >
            {subStatus?.isPremium ? "Active" : "Free"}
          </span>
        </div>

        <Link
          href="/pricing"
          className="flex items-center justify-between p-3.5 rounded-[16px] bg-canvas hover:bg-blush/20 border border-border text-xs font-medium transition-all group"
        >
          <span className="text-ink group-hover:text-primary transition-colors font-semibold">
            {subStatus?.isPremium ? "Manage Subscription" : "Upgrade - Covers Both"}
          </span>
          <ChevronRight size={15} className="text-inkSoft group-hover:text-primary transition-colors" />
        </Link>
      </Card>

      {/* 7. LEGAL & COMMUNITY GUIDELINES LINKS */}
      <Card className="rounded-[24px] bg-white border border-border p-5 shadow-[0_8px_32px_rgba(255,90,126,0.06)] space-y-3">
        <span className="text-[11px] font-semibold text-primary uppercase tracking-wider block">
          Trust & Legal
        </span>

        <div className="divide-y divide-border/60 text-xs">
          <button
            type="button"
            onClick={() => setActiveLegalModal("guidelines")}
            className="w-full py-2.5 flex items-center justify-between text-left hover:text-primary transition-colors"
          >
            <span className="font-medium text-ink">Community Guidelines (18+, Consensual)</span>
            <ChevronRight size={14} className="text-inkSoft" />
          </button>

          <Link
            href="/privacy"
            className="w-full py-2.5 flex items-center justify-between text-left hover:text-primary transition-colors"
          >
            <span className="font-medium text-ink">Privacy Policy</span>
            <ChevronRight size={14} className="text-inkSoft" />
          </Link>

          <Link
            href="/terms"
            className="w-full py-2.5 flex items-center justify-between text-left hover:text-primary transition-colors"
          >
            <span className="font-medium text-ink">Terms of Service</span>
            <ChevronRight size={14} className="text-inkSoft" />
          </Link>
        </div>
      </Card>

      {/* 8. DANGER ZONE: LEAVE SPACE */}
      <Card className="rounded-[24px] bg-white border border-red-100 p-5 shadow-[0_8px_32px_rgba(255,90,126,0.04)] space-y-3">
        <div className="flex items-center space-x-2 text-deep">
          <AlertTriangle size={15} />
          <span className="text-[11px] font-semibold uppercase tracking-wider">
            Danger Zone
          </span>
        </div>
        <p className="text-xs text-inkSoft">
          Separates this space. Neither partner will have access to shared moments.
        </p>

        <button
          type="button"
          onClick={() => setShowLeaveModal(true)}
          className="w-full h-11 rounded-full bg-red-50 hover:bg-red-100 text-deep font-medium text-xs transition-colors border border-red-200/80 flex items-center justify-center space-x-1.5"
        >
          <Trash2 size={14} />
          <span>Leave Space</span>
        </button>
      </Card>

      {/* CONFIRMATION MODAL: LEAVE SPACE */}
      {showLeaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-sm">
          <div className="w-full max-w-[380px] bg-white rounded-[24px] border border-border p-6 shadow-[0_8px_32px_rgba(255,90,126,0.18)] text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-50 text-deep flex items-center justify-center mx-auto">
              <AlertTriangle size={22} />
            </div>

            <div className="space-y-1.5">
              <h3 className="font-heading text-2xl text-ink font-normal">
                Leave Shared Space?
              </h3>
              {/* EXACT headline/text requirement */}
              <p className="text-xs text-inkSoft leading-relaxed font-body">
                Are you sure? This will erase your private space.
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                disabled={leavingSpace}
                onClick={handleConfirmLeaveSpace}
                className="w-full h-11 rounded-full bg-deep hover:bg-[#d6385b] text-white font-medium text-xs transition-all shadow-xs"
              >
                {leavingSpace ? "Leaving space..." : "Yes, Leave Space"}
              </button>
              <button
                type="button"
                onClick={() => setShowLeaveModal(false)}
                className="w-full py-2 text-xs font-medium text-inkSoft hover:text-ink transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LEGAL / GUIDELINES MODAL */}
      {activeLegalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-sm">
          <div className="relative w-full max-w-[420px] bg-white rounded-[24px] border border-border p-6 shadow-[0_8px_32px_rgba(255,90,126,0.18)] space-y-4 max-h-[85vh] overflow-y-auto">
            <button
              type="button"
              onClick={() => setActiveLegalModal(null)}
              className="absolute top-4 right-4 p-1.5 rounded-full text-inkSoft hover:text-ink"
            >
              <X size={18} />
            </button>

            {activeLegalModal === "guidelines" && (
              <div className="space-y-3">
                <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-[#FFC2CE]/40 text-primary text-[10px] font-semibold uppercase tracking-wider">
                  <Shield size={12} />
                  <span>Sacred Covenant Guard</span>
                </div>
                <h3 className="font-heading text-2xl text-ink font-normal">
                  Community Guidelines
                </h3>
                <div className="space-y-2.5 text-xs text-inkSoft leading-relaxed">
                  <p>
                    <strong className="text-ink">1. Private for Two:</strong> Christone is strictly a private, end-to-end space for you and your partner. There are no public feeds or external followers.
                  </p>
                  <p>
                    <strong className="text-ink">2. Age 18+ and Married Gating:</strong> Our intimacy decks are strictly 18+ and gated exclusively for married couples who have voluntarily confirmed consent.
                  </p>
                  <p>
                    <strong className="text-ink">3. Christ-Honoring & Non-Graphic:</strong> All communication, prompts, and games are designed to honor God, cultivate emotional safety, and celebrate covenant love without vulgarity or graphic content.
                  </p>
                  <p>
                    <strong className="text-ink">4. Consensual & Skippable:</strong> Intimacy and talk prompts are always skippable. Both partners retain full autonomy with zero pressure.
                  </p>
                </div>
              </div>
            )}

            {activeLegalModal === "privacy" && (
              <div className="space-y-3">
                <h3 className="font-heading text-2xl text-ink font-normal">
                  Privacy Policy
                </h3>
                <div className="space-y-2.5 text-xs text-inkSoft leading-relaxed">
                  <p>
                    Your vulnerability is sacred. Christone stores answers, check-ins, and moments exclusively for your linked couple account.
                  </p>
                  <p>
                    We never sell personal data, sell advertisements, or monetize private conversations. Data is protected with encrypted Supabase infrastructure and industry-standard security.
                  </p>
                </div>
              </div>
            )}

            {activeLegalModal === "terms" && (
              <div className="space-y-3">
                <h3 className="font-heading text-2xl text-ink font-normal">
                  Terms of Service
                </h3>
                <div className="space-y-2.5 text-xs text-inkSoft leading-relaxed">
                  <p>
                    By using Christone Couples, you agree to treat your shared space with mutual respect, honesty, and grace.
                  </p>
                  <p>
                    Subscribing to Christone Premium covers both partners under one single billing cycle. You may cancel at any time with no lock-in.
                  </p>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => setActiveLegalModal(null)}
              className="w-full h-10 rounded-full bg-canvas hover:bg-blush/20 border border-border text-xs font-semibold text-ink transition-colors mt-2"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
