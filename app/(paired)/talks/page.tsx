"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock, Sparkles, MessageCircle, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Pill } from "@/components/ui/pill";
import { supabase } from "@/lib/supabase/client";
import { getDailyPrompt, type DailyPromptData } from "@/lib/daily-prompt";
import { SkeletonList, SkeletonCard } from "@/components/ui/skeleton-card";
import { ErrorState } from "@/components/ui/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";

interface Deck {
  id: string;
  title: string;
  category: string;
  stage: string;
  description: string | null;
  icon_name: string;
  is_intimacy: boolean | null;
}

const DECK_ICONS: Record<string, string> = {
  Foundation: "/icons/decks/foundation.svg",
  Money: "/icons/decks/money.svg",
  Family: "/icons/decks/family.svg",
  Conflict: "/icons/decks/conflict.svg",
  "Fun & Gist": "/icons/decks/fun.svg",
  "Kingdom Purpose": "/icons/decks/purpose.svg",
  "Romance & Affection": "/icons/decks/romance.svg",
  "Married Intimacy": "/icons/decks/intimacy.svg",
};

export default function TalksPage() {
  const router = useRouter();
  const [decks, setDecks] = React.useState<Deck[]>([]);
  const [userStage, setUserStage] = React.useState<string>("courting");
  const [isMarriedConfirmed, setIsMarriedConfirmed] = React.useState<boolean>(false);
  const [dailyPrompt, setDailyPrompt] = React.useState<DailyPromptData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Gate 1 Modal state
  const [isMarriedOnlyModalOpen, setIsMarriedOnlyModalOpen] = React.useState(false);

  const loadData = React.useCallback(async () => {
    setLoading(true);
    setError(null);

    // 1. Check local storage fallback
    if (typeof window !== "undefined") {
      const localStage = localStorage.getItem("stage");
      if (localStage) setUserStage(localStage);
    }

    try {
      // 2. Fetch user profile & couple for daily prompt
      const { data: authData } = await supabase.auth.getUser();
      if (authData?.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("stage, is_married_confirmed")
          .eq("id", authData.user.id)
          .maybeSingle();

        if (profile) {
          if (profile.stage) setUserStage(profile.stage);
          setIsMarriedConfirmed(!!profile.is_married_confirmed);
        }

        // Fetch paired couple
        const { data: couple } = await supabase
          .from("couples")
          .select("id")
          .or(`partner_a.eq.${authData.user.id},partner_b.eq.${authData.user.id}`)
          .eq("status", "paired")
          .maybeSingle();

        if (couple) {
          const daily = await getDailyPrompt(couple.id);
          if (daily) setDailyPrompt(daily);
        }
      }

      // 3. Fetch decks from database
      const { data: decksList, error: decksErr } = await supabase
        .from("talk_decks")
        .select("*")
        .order("id");

      if (decksErr) throw decksErr;

      if (decksList && decksList.length > 0) {
        setDecks(decksList);
      } else {
        // Fallback static list of 8 decks
        setDecks([
          { id: "d1000000-0000-0000-0000-000000000001", title: "Foundation", category: "Spiritual", stage: "all", description: null, icon_name: "message-circle", is_intimacy: false },
          { id: "d1000000-0000-0000-0000-000000000002", title: "Money", category: "Finances", stage: "all", description: null, icon_name: "wallet", is_intimacy: false },
          { id: "d1000000-0000-0000-0000-000000000003", title: "Family", category: "Heritage", stage: "all", description: null, icon_name: "home", is_intimacy: false },
          { id: "d1000000-0000-0000-0000-000000000004", title: "Conflict", category: "Peace", stage: "all", description: null, icon_name: "heart-handshake", is_intimacy: false },
          { id: "d1000000-0000-0000-0000-000000000005", title: "Fun & Gist", category: "Laughter", stage: "all", description: null, icon_name: "smile", is_intimacy: false },
          { id: "d1000000-0000-0000-0000-000000000006", title: "Kingdom Purpose", category: "Mission", stage: "all", description: null, icon_name: "compass", is_intimacy: false },
          { id: "d1000000-0000-0000-0000-000000000007", title: "Romance & Affection", category: "Cherishing Hearts", stage: "all", description: null, icon_name: "heart", is_intimacy: false },
          { id: "d1000000-0000-0000-0000-000000000008", title: "Married Intimacy", category: "Sacred Oneness", stage: "married", description: null, icon_name: "sparkles", is_intimacy: true },
        ]);
      }
    } catch (err) {
      console.error("Failed to load talk decks:", err);
      setError("Something soft broke. Try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className="space-y-6 pb-20"
    >
      {/* Header */}
      <header className="space-y-1">
        <Pill>Talk Decks</Pill>
        <h1 className="font-heading text-3xl text-ink font-normal pt-1">
          Guided Conversations
        </h1>
        <p className="text-sm text-inkSoft">
          120 intentional prompts to deepen your connection.
        </p>
      </header>

      {/* Featured Card: Today's Talk */}
      {dailyPrompt && !loading && !error && (
        <section className="rounded-[24px] border-2 border-primary bg-[#FFC2CE]/30 p-5 shadow-[0_8px_32px_rgba(255,90,126,0.08)] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-primary">
              {dailyPrompt.prompt.deck?.title || "Daily Question"}
            </span>
            <span className="text-[11px] text-inkSoft font-medium">Daily</span>
          </div>

          <h2 className="font-heading text-2xl text-ink font-normal leading-snug">
            Today&apos;s Talk
          </h2>

          <p className="text-sm text-ink leading-relaxed font-body">
            {dailyPrompt.prompt.prompt_text}
          </p>

          <div className="pt-1">
            <Link
              href={`/talks/${dailyPrompt.prompt.deck_id}?promptId=${dailyPrompt.prompt_id}`}
              className="inline-flex items-center justify-center h-10 px-5 rounded-full bg-primary hover:bg-deep text-white text-xs font-medium transition-all shadow-xs active:scale-[0.98] space-x-1.5"
            >
              <MessageCircle size={14} strokeWidth={1.5} />
              <span>Answer Together</span>
            </Link>
          </div>
        </section>
      )}

      {/* Loading state: 3 skeleton cards bg #F5E6E8 animate-pulse height 80px radius 24px */}
      {loading ? (
        <SkeletonList count={3} />
      ) : error ? (
        <ErrorState onRetry={loadData} />
      ) : decks.length === 0 ? (
        <EmptyState
          headline="No conversation decks"
          subtext="Your decks will appear here shortly."
          actionLabel="Refresh Decks"
          onAction={loadData}
        />
      ) : (
        /* Grid: 2 columns, gap 16px with stagger 0.05s */
        <motion.div
          variants={{
            hidden: { opacity: 0 },
            visible: {
              opacity: 1,
              transition: { staggerChildren: 0.05 },
            },
          }}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-2 gap-4"
        >
        {decks.map((deck, idx) => {
          const isEven = idx % 2 === 0;
          const bgClass = isEven ? "bg-white" : "bg-[#FFC2CE]/20";
          const iconSrc = DECK_ICONS[deck.title] || "/icons/decks/foundation.svg";

          // Intimacy gating logic
          const isIntimacyDeck = !!deck.is_intimacy;
          const isLockedForNonMarried = isIntimacyDeck && userStage !== "married";
          const isUnconfirmedMarried = isIntimacyDeck && userStage === "married" && !isMarriedConfirmed;

          const handleCardClick = () => {
            if (isLockedForNonMarried) {
              // Gate 1: show modal "This deck is for married couples only"
              setIsMarriedOnlyModalOpen(true);
              return;
            }
            // Navigate to deck detail (if unconfirmed married, /talks/[id] will show Gate 2 confirmation screen)
            router.push(`/talks/${deck.id}`);
          };

          return (
            <motion.div
              key={deck.id}
              variants={{
                hidden: { opacity: 0, y: 10 },
                visible: { opacity: 1, y: 0 },
              }}
              whileTap={{ scale: 0.98 }}
              onClick={handleCardClick}
              className={cn(
                "relative rounded-[24px] border border-border p-4 shadow-[0_8px_32px_rgba(255,90,126,0.08)] flex flex-col justify-between min-h-[170px] transition-all overflow-hidden select-none cursor-pointer",
                bgClass,
                "hover:border-primary/50"
              )}
            >
              {/* Top: 32px circle icon with white bg */}
              <div className="flex items-center justify-between mb-4">
                <div className="w-8 h-8 rounded-full bg-white border border-border/80 flex items-center justify-center p-1 shadow-xs">
                  <Image
                    src={iconSrc}
                    alt={deck.title}
                    width={20}
                    height={20}
                    className="w-5 h-5 object-contain"
                  />
                </div>
                {isIntimacyDeck && (
                  <Sparkles size={14} strokeWidth={1.5} className="text-primary" />
                )}
              </div>

              {/* Bottom: Title 16px serif + Count "15 prompts" 12px #6B5B5F */}
              <div className="space-y-1">
                <h2 className="font-heading text-[16px] text-ink leading-snug line-clamp-2">
                  {deck.title}
                </h2>
                <p className="text-[12px] text-inkSoft">15 prompts</p>
              </div>

              {/* Lock Overlay for Gated Intimacy */}
              {(isLockedForNonMarried || isUnconfirmedMarried) && (
                <div className="absolute inset-0 z-10 bg-white/85 backdrop-blur-[2px] flex flex-col items-center justify-center p-3 text-center">
                  <div className="w-8 h-8 rounded-full bg-blush/40 flex items-center justify-center text-ink mb-1.5 shadow-xs">
                    <Lock size={15} strokeWidth={1.5} />
                  </div>
                  <p className="text-[11px] font-medium text-ink leading-tight max-w-[110px]">
                    {isLockedForNonMarried ? "Unlocks when married" : "Confirm to unlock"}
                  </p>
                </div>
              )}
            </motion.div>
          );
        })}
      </motion.div>
    )}

      {/* Gate 1 Modal: "This deck is for married couples only" + button to update stage in settings */}
      <AnimatePresence>
        {isMarriedOnlyModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMarriedOnlyModalOpen(false)}
              className="fixed inset-0 bg-ink/40 backdrop-blur-xs transition-opacity"
            />

            <motion.div
              initial={{ scale: 0.94, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.94, opacity: 0, y: 12 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="relative z-10 w-full max-w-[360px] bg-white rounded-[24px] p-6 shadow-2xl border border-border text-center space-y-4"
            >
              {/* Close Button */}
              <button
                type="button"
                onClick={() => setIsMarriedOnlyModalOpen(false)}
                aria-label="Close"
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-canvas border border-border flex items-center justify-center text-inkSoft hover:text-ink transition-colors"
              >
                <X size={16} strokeWidth={1.5} />
              </button>

              {/* Icon */}
              <div className="w-12 h-12 rounded-full bg-blush/50 text-primary flex items-center justify-center mx-auto shadow-xs">
                <Lock size={20} strokeWidth={1.5} />
              </div>

              {/* Headline (max 6 words) */}
              <div className="space-y-1">
                <h3 className="font-heading text-2xl text-ink font-normal">
                  Married couples only
                </h3>
                <p className="text-xs text-inkSoft leading-relaxed pt-1">
                  This deck is for married couples only. You can update your relationship season in settings anytime.
                </p>
              </div>

              {/* Action Button: Update stage in settings */}
              <div className="pt-2 space-y-2">
                <Link
                  href="/settings"
                  className="w-full h-11 rounded-full bg-primary hover:bg-deep text-white font-medium text-xs transition-all flex items-center justify-center shadow-xs"
                >
                  Update Stage in Settings
                </Link>
                <button
                  type="button"
                  onClick={() => setIsMarriedOnlyModalOpen(false)}
                  className="w-full h-10 rounded-full border border-border bg-white text-ink text-xs font-medium hover:bg-canvas transition-colors"
                >
                  I Understand
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
