"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { ArrowLeft, MessageCircle, Sparkles, Lock, Check } from "lucide-react";
import { Pill } from "@/components/ui/pill";
import { supabase } from "@/lib/supabase/client";
import {
  TalkAnswerSheet,
  TalkPromptItem,
  TalkAnswerItem,
} from "@/components/talk-answer-sheet";
import { RomanceIdeaModal } from "@/components/romance-idea-modal";
import { Paywall } from "@/components/paywall";
import { checkAccess } from "@/lib/subscription";
import { recordCoupleActivity } from "@/lib/retention";
import { cn } from "@/lib/utils";

function TalkDeckDetailContent() {
  const params = useParams();
  const deckId = params?.id as string;

  const [loading, setLoading] = React.useState(true);
  const [deck, setDeck] = React.useState<any>(null);
  const [prompts, setPrompts] = React.useState<TalkPromptItem[]>([]);
  const [answers, setAnswers] = React.useState<TalkAnswerItem[]>([]);
  const [currentUserId, setCurrentUserId] = React.useState<string>("");
  const [currentUserName, setCurrentUserName] = React.useState<string>("You");
  const [partnerId, setPartnerId] = React.useState<string>("");
  const [partnerName, setPartnerName] = React.useState<string>("Partner");
  const [coupleId, setCoupleId] = React.useState<string>("");

  // Stage & Intimacy gating
  const [userStage, setUserStage] = React.useState<string>("courting");
  const [isMarriedConfirmed, setIsMarriedConfirmed] = React.useState<boolean>(false);
  const [consentChecked, setConsentChecked] = React.useState<boolean>(false);
  const [isUnlocking, setIsUnlocking] = React.useState<boolean>(false);

  // Active prompt opened in the bottom sheet
  const [activePrompt, setActivePrompt] = React.useState<TalkPromptItem | null>(null);
  const [isSheetOpen, setIsSheetOpen] = React.useState(false);
  const [isIdeaModalOpen, setIsIdeaModalOpen] = React.useState(false);
  const [savedPrompts, setSavedPrompts] = React.useState<Record<string, boolean>>({});
  const [isPaywallOpen, setIsPaywallOpen] = React.useState(false);
  const [isPremium, setIsPremium] = React.useState(false);

  const searchParams = useSearchParams();
  const promptIdParam = searchParams.get("promptId");
  const paywallParam = searchParams.get("paywall");

  // Check paywall query parameter from middleware
  React.useEffect(() => {
    if (paywallParam === "talk_limit") {
      setIsPaywallOpen(true);
    }
  }, [paywallParam]);

  // Auto-open prompt if promptId is in query params
  React.useEffect(() => {
    if (promptIdParam && prompts.length > 0 && !activePrompt) {
      const match = prompts.find((p) => p.id === promptIdParam);
      if (match) {
        setActivePrompt(match);
        setIsSheetOpen(true);
      }
    }
  }, [promptIdParam, prompts, activePrompt]);

  // Fetch initial data
  React.useEffect(() => {
    async function loadData() {
      if (!deckId) return;

      // Fallback stage from localStorage
      if (typeof window !== "undefined") {
        const localStage = localStorage.getItem("stage");
        if (localStage) setUserStage(localStage);
      }

      try {
        // 1. Current user
        const {
          data: { user },
        } = await supabase.auth.getUser();

        let uid = user?.id;
        if (!uid && typeof window !== "undefined") {
          uid = localStorage.getItem("user_id") || "";
        }

        if (uid) {
          setCurrentUserId(uid);

          // Get profile
          const { data: myProfile } = await supabase
            .from("profiles")
            .select("display_name, stage, is_married_confirmed")
            .eq("id", uid)
            .maybeSingle();

          if (myProfile) {
            if (myProfile.display_name) setCurrentUserName(myProfile.display_name);
            if (myProfile.stage) setUserStage(myProfile.stage);
            if (myProfile.is_married_confirmed) setIsMarriedConfirmed(true);
          }

          // 2. Couple - match paired first or latest couple
          const { data: coupleList } = await supabase
            .from("couples")
            .select("*")
            .or(`partner_a.eq.${uid},partner_b.eq.${uid}`)
            .order("created_at", { ascending: false });

          const coupleData =
            coupleList?.find((c) => c.status === "paired") ||
            coupleList?.[0] ||
            null;

          if (coupleData) {
            setCoupleId(coupleData.id);
            if (typeof window !== "undefined") {
              localStorage.setItem("couple_id", coupleData.id);
            }
            if (coupleData.is_married_confirmed) setIsMarriedConfirmed(true);

            const pId =
              coupleData.partner_a === uid
                ? coupleData.partner_b
                : coupleData.partner_a;

            if (pId) {
              setPartnerId(pId);
              const { data: pProfile } = await supabase
                .from("profiles")
                .select("display_name")
                .eq("id", pId)
                .maybeSingle();

              if (pProfile?.display_name) {
                setPartnerName(pProfile.display_name);
              }
            }

            // Fetch answers for this couple
            const { data: answersData } = await supabase
              .from("talk_answers")
              .select("*")
              .eq("couple_id", coupleData.id);

            if (answersData) {
              setAnswers(answersData);
            }
          }
        }

        // 3. Deck
        const { data: deckData } = await supabase
          .from("talk_decks")
          .select("*")
          .eq("id", deckId)
          .maybeSingle();

        if (deckData) setDeck(deckData);

        // 4. Prompts
        const { data: promptsList } = await supabase
          .from("talk_prompts")
          .select("*")
          .eq("deck_id", deckId)
          .order("order_index", { ascending: true });

        if (promptsList) setPrompts(promptsList);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [deckId]);

  // Realtime subscription for live answering
  React.useEffect(() => {
    if (!coupleId) return;

    const channel = supabase
      .channel(`talk_answers_couple_${coupleId}`, {
        config: { broadcast: { self: false } },
      })
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "talk_answers",
          filter: `couple_id=eq.${coupleId}`,
        },
        (payload) => {
          const newAnswer = payload.new as TalkAnswerItem;
          if (!newAnswer?.id) return;
          setAnswers((prev) => {
            const filtered = prev.filter((a) => a.id !== newAnswer.id);
            return [...filtered, newAnswer];
          });
        }
      )
      .on("broadcast", { event: "talk_answer_saved" }, (payload) => {
        if (payload?.payload?.answer) {
          const bAnswer = payload.payload.answer as TalkAnswerItem;
          setAnswers((prev) => {
            const filtered = prev.filter((a) => a.id !== bAnswer.id);
            return [...filtered, bAnswer];
          });
        }
      })
      .subscribe();

    // Fast polling fallback while on this talk deck
    const pollInterval = setInterval(async () => {
      const { data } = await supabase
        .from("talk_answers")
        .select("*")
        .eq("couple_id", coupleId);
      if (data && data.length > 0) {
        setAnswers(data);
      }
    }, 2500);

    return () => {
      clearInterval(pollInterval);
      supabase.removeChannel(channel);
    };
  }, [coupleId]);

  // Helper functions for prompt status
  const getPromptAnswers = (promptId: string) => {
    const promptAnswers = answers.filter((a) => a.prompt_id === promptId);
    const resolvedUid =
      currentUserId ||
      (typeof window !== "undefined" ? localStorage.getItem("user_id") || "" : "");
    const myAns = promptAnswers.find((a) => a.user_id === resolvedUid) || null;
    const partnerAns =
      promptAnswers.find((a) => a.user_id !== resolvedUid) || null;
    return { myAns, partnerAns };
  };

  const getPromptStatus = (promptId: string): "answered" | "your_turn" | "waiting" | "unanswered" => {
    const { myAns, partnerAns } = getPromptAnswers(promptId);
    if (myAns && partnerAns) return "answered";
    if (partnerAns && !myAns) return "your_turn";
    if (myAns && !partnerAns) return "waiting";
    return "unanswered";
  };

  // Answered count (where both have answered)
  const totalPrompts = prompts.length;
  const answeredCount = prompts.filter(
    (p) => getPromptStatus(p.id) === "answered"
  ).length;
  const progressPercent =
    totalPrompts > 0 ? (answeredCount / totalPrompts) * 100 : 0;

  // Prompts where partner answered and current user has not
  const partnerPendingPrompts = prompts.filter(
    (p) => getPromptStatus(p.id) === "your_turn"
  );

  const handleOpenPrompt = async (prompt: TalkPromptItem) => {
    if (!isPremium && coupleId) {
      const access = await checkAccess(coupleId, "talks");
      if (!access.allowed) {
        setIsPaywallOpen(true);
        return;
      }
    }
    setActivePrompt(prompt);
    setIsSheetOpen(true);
  };

  const handleUnlockIntimacy = async () => {
    if (!consentChecked || isUnlocking) return;
    setIsUnlocking(true);
    try {
      if (currentUserId) {
        await supabase
          .from("profiles")
          .update({ is_married_confirmed: true })
          .eq("id", currentUserId);
      }
      if (coupleId) {
        await supabase
          .from("couples")
          .update({ is_married_confirmed: true })
          .eq("id", coupleId);
      }
      setIsMarriedConfirmed(true);
    } catch (err) {
      console.error("Failed to unlock married intimacy:", err);
    } finally {
      setIsUnlocking(false);
    }
  };

  const handleSubmitAnswer = async (promptId: string, answerText: string) => {
    let resolvedUid = currentUserId;
    let resolvedCoupleId = coupleId;

    if (!resolvedUid) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      resolvedUid =
        user?.id ||
        (typeof window !== "undefined" ? localStorage.getItem("user_id") || "" : "");
      if (resolvedUid) setCurrentUserId(resolvedUid);
    }

    if (!resolvedCoupleId && resolvedUid) {
      const { data: coupleList } = await supabase
        .from("couples")
        .select("id, status")
        .or(`partner_a.eq.${resolvedUid},partner_b.eq.${resolvedUid}`)
        .order("created_at", { ascending: false });
      const foundCouple =
        coupleList?.find((c) => c.status === "paired") || coupleList?.[0];
      if (foundCouple) {
        resolvedCoupleId = foundCouple.id;
        setCoupleId(foundCouple.id);
      } else if (typeof window !== "undefined") {
        resolvedCoupleId = localStorage.getItem("couple_id") || "";
      }
    }

    if (!resolvedCoupleId || !resolvedUid) {
      console.error("Missing coupleId or userId for talk answer submission");
      throw new Error("You must be connected with your partner to share answers.");
    }

    if (!isPremium) {
      const access = await checkAccess(resolvedCoupleId, "talks");
      if (!access.allowed) {
        setIsPaywallOpen(true);
        throw new Error("Talk limit reached. Please upgrade to unlock all talks.");
      }
    }

    // Check if an answer already exists for this prompt and user
    const { data: existingAnswer } = await supabase
      .from("talk_answers")
      .select("id")
      .eq("prompt_id", promptId)
      .eq("couple_id", resolvedCoupleId)
      .eq("user_id", resolvedUid)
      .maybeSingle();

    let savedAnswer: TalkAnswerItem | null = null;

    if (existingAnswer) {
      const { data, error } = await supabase
        .from("talk_answers")
        .update({ answer: answerText })
        .eq("id", existingAnswer.id)
        .select()
        .single();

      if (error) {
        console.error("Error updating talk answer:", error);
        throw new Error(error.message || "Failed to update your answer.");
      }
      savedAnswer = data;
    } else {
      const { data, error } = await supabase
        .from("talk_answers")
        .insert({
          prompt_id: promptId,
          couple_id: resolvedCoupleId,
          user_id: resolvedUid,
          answer: answerText,
        })
        .select()
        .single();

      if (error) {
        console.error("Error inserting talk answer:", error);
        throw new Error(error.message || "Failed to save your answer.");
      }
      savedAnswer = data;
    }

    if (savedAnswer) {
      setAnswers((prev) => {
        const filtered = prev.filter(
          (a) =>
            a.id !== savedAnswer!.id &&
            !(a.prompt_id === promptId && a.user_id === resolvedUid)
        );
        return [...filtered, savedAnswer!];
      });

      // Broadcast immediately to partner
      try {
        supabase.channel(`talk_answers_couple_${resolvedCoupleId}`).send({
          type: "broadcast",
          event: "talk_answer_saved",
          payload: { answer: savedAnswer },
        });
      } catch (broadcastErr) {
        console.warn("Peer broadcast notice:", broadcastErr);
      }

      // Record couple streak activity
      recordCoupleActivity(resolvedCoupleId).catch((err) =>
        console.error("Streak activity update error:", err)
      );
    }

    return true;
  };

  const handleSaveToSpace = async (
    prompt: TalkPromptItem,
    myAnswerText: string,
    partnerAnswerText: string
  ) => {
    if (!coupleId || !currentUserId || deck?.is_intimacy) return false;

    const { error } = await supabase.from("moments").insert({
      couple_id: coupleId,
      author_id: currentUserId,
      type: "talk",
      content: JSON.stringify({
        deck_id: deck?.id,
        deck_title: deck?.title || "Talk Prompt",
        prompt_id: prompt.id,
        question: prompt.prompt_text,
        answers: [
          { name: currentUserName, answer: myAnswerText },
          { name: partnerName, answer: partnerAnswerText },
        ],
      }),
    });

    if (error) {
      console.error("Error saving moment to space:", error);
      return false;
    }

    setSavedPrompts((prev) => ({ ...prev, [prompt.id]: true }));
    return true;
  };

  const activeAnswers = activePrompt ? getPromptAnswers(activePrompt.id) : null;
  const isRomanceDeck =
    deck?.title?.toLowerCase().includes("romance") ||
    deck?.category?.toLowerCase().includes("cherishing") ||
    deck?.category?.toLowerCase().includes("adoration");

  // GATE 1: Courting / Engaged users cannot see married intimacy
  if (deck?.is_intimacy && userStage !== "married") {
    return (
      <div className="space-y-6 pb-20">
        <Link
          href="/talks"
          className="inline-flex items-center space-x-1.5 text-xs text-inkSoft hover:text-ink transition-colors"
        >
          <ArrowLeft size={16} strokeWidth={1.5} />
          <span>All Decks</span>
        </Link>

        <div className="bg-white rounded-[24px] border border-border p-6 shadow-[0_8px_32px_rgba(255,90,126,0.08)] text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-blush/40 text-primary flex items-center justify-center mx-auto shadow-xs">
            <Lock size={24} strokeWidth={1.5} />
          </div>

          <div className="space-y-1.5">
            <h1 className="font-heading text-2xl text-ink font-normal">
              Married couples only
            </h1>
            <p className="text-xs text-inkSoft leading-relaxed max-w-[320px] mx-auto">
              This deck is for married couples only. Christone protects intimate conversation spaces specifically for marriage.
            </p>
          </div>

          <div className="pt-2 space-y-2">
            <Link
              href="/settings"
              className="w-full h-12 rounded-full bg-primary hover:bg-deep text-white font-medium text-xs transition-all flex items-center justify-center shadow-xs"
            >
              Update Stage in Settings
            </Link>
            <Link
              href="/talks"
              className="w-full h-11 rounded-full border border-border bg-white text-ink text-xs font-medium hover:bg-canvas transition-colors flex items-center justify-center"
            >
              Back to Talks
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // GATE 2: Married users must confirm consent & 18+ to unlock
  if (deck?.is_intimacy && !isMarriedConfirmed) {
    return (
      <div className="space-y-6 pb-20">
        <Link
          href="/talks"
          className="inline-flex items-center space-x-1.5 text-xs text-inkSoft hover:text-ink transition-colors"
        >
          <ArrowLeft size={16} strokeWidth={1.5} />
          <span>All Decks</span>
        </Link>

        <div className="bg-white rounded-[24px] border border-border p-6 shadow-[0_8px_32px_rgba(255,90,126,0.08)] space-y-5 text-center">
          {/* Abstract soft illustration: 300x300 two overlapping circles forming heart, blush pink #FFC2CE */}
          <div className="relative w-44 h-44 mx-auto rounded-[24px] overflow-hidden border border-border shadow-xs bg-[#FFFBFC]">
            <Image
              src="/illustrations/married-intimacy.svg"
              alt="Sacred Intimacy"
              fill
              className="object-contain p-2"
            />
          </div>

          <div className="space-y-2">
            <h1 className="font-heading text-3xl text-ink font-normal">
              For married couples
            </h1>
            <p className="text-xs text-inkSoft leading-relaxed font-body">
              This deck contains private prompts for married couples about intimacy communication. Non-graphic, consent-focused, Christ-honoring. 18+, consensual, skippable. Both must confirm.
            </p>
          </div>

          {/* Checkbox EXACT: "We confirm we are married, 18+, and consent" */}
          <label className="flex items-center space-x-3 text-left p-3.5 rounded-[16px] border border-border bg-canvas/60 hover:bg-canvas cursor-pointer transition-colors select-none">
            <input
              type="checkbox"
              checked={consentChecked}
              onChange={(e) => setConsentChecked(e.target.checked)}
              className="w-4 h-4 rounded text-primary focus:ring-primary/20 accent-[#FF5A7E] flex-shrink-0 cursor-pointer"
            />
            <span className="text-xs text-ink font-medium leading-snug">
              We confirm we are married, 18+, and consent
            </span>
          </label>

          {/* Button: "Unlock" -> sets is_married_confirmed true */}
          <button
            type="button"
            onClick={handleUnlockIntimacy}
            disabled={!consentChecked || isUnlocking}
            className="w-full h-12 rounded-full bg-primary hover:bg-deep text-white font-medium text-sm transition-all shadow-[0_8px_32px_rgba(255,90,126,0.15)] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            <span>{isUnlocking ? "Unlocking..." : "Unlock"}</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Top Header & Navigation */}
      <div className="space-y-4">
        <Link
          href="/talks"
          className="inline-flex items-center space-x-1.5 text-xs text-inkSoft hover:text-ink transition-colors"
        >
          <ArrowLeft size={16} strokeWidth={1.5} />
          <span>All Decks</span>
        </Link>

        <div className="space-y-1">
          <Pill>{deck?.category || "Talk Deck"}</Pill>
          <h1 className="font-heading text-3xl text-ink font-normal pt-1">
            {deck?.title || "Conversation Deck"}
          </h1>
          <div className="flex items-center justify-between text-xs text-inkSoft pt-1">
            <span>
              {answeredCount} of {totalPrompts} answered together
            </span>
            <span>{Math.round(progressPercent)}%</span>
          </div>

          {/* Progress bar: width = answered/total * 100% bg #FF5A7E height 4px rounded */}
          <div className="w-full h-1 bg-border rounded-full overflow-hidden mt-2">
            <div
              className="h-1 rounded-full bg-primary transition-all duration-500 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Partner Answered Banner: If partner answered and you didn't */}
      {partnerPendingPrompts.length > 0 && (
        <div
          onClick={() => handleOpenPrompt(partnerPendingPrompts[0])}
          className="p-4 rounded-[20px] bg-blush/35 border border-blush flex items-center justify-between cursor-pointer hover:bg-blush/50 transition-all shadow-[0_8px_32px_rgba(255,90,126,0.06)] active:scale-[0.99]"
        >
          <div className="flex items-center space-x-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse flex-shrink-0" />
            <p className="text-xs font-medium text-ink">
              <span className="font-semibold text-deep">{partnerName}</span> answered. Your turn.
            </p>
          </div>
          <span className="text-[11px] font-semibold text-primary hover:text-deep transition-colors whitespace-nowrap pl-2">
            Answer now &rarr;
          </span>
        </div>
      )}

      {/* Romance Idea Generator: "Idea for tonight" */}
      {isRomanceDeck && (
        <button
          type="button"
          onClick={() => setIsIdeaModalOpen(true)}
          className="w-full p-4 rounded-[20px] bg-gradient-to-r from-[#FFF5F7] to-[#FFC2CE]/35 border border-primary/30 flex items-center justify-between text-left hover:border-primary transition-all shadow-[0_8px_32px_rgba(255,90,126,0.06)] group cursor-pointer active:scale-[0.99]"
        >
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-[#FFC2CE] flex items-center justify-center text-primary shadow-xs group-hover:scale-105 transition-transform flex-shrink-0">
              <Sparkles size={18} strokeWidth={1.5} className="fill-primary/20" />
            </div>
            <div>
              <span className="text-[10px] font-semibold text-primary uppercase tracking-wider block">
                Romance &amp; Affection
              </span>
              <span className="font-heading text-lg text-ink">Idea for tonight</span>
            </div>
          </div>
          <span className="h-8 px-3.5 rounded-full bg-white border border-border text-xs font-medium text-ink group-hover:bg-primary group-hover:text-white group-hover:border-primary transition-all flex items-center shadow-xs">
            Surprise me &rarr;
          </span>
        </button>
      )}

      {/* Prompts List */}
      <div className="space-y-3">
        {loading ? (
          <div className="py-12 text-center text-xs text-inkSoft">
            Loading prompts...
          </div>
        ) : prompts.length === 0 ? (
          <div className="py-12 text-center text-xs text-inkSoft">
            No prompts found in this deck.
          </div>
        ) : (
          prompts.map((p, idx) => {
            const status = getPromptStatus(p.id);

            return (
              <div
                key={p.id}
                onClick={() => handleOpenPrompt(p)}
                className="bg-white rounded-[20px] p-4 border border-border shadow-[0_8px_32px_rgba(255,90,126,0.08)] space-y-3 transition-transform hover:-translate-y-0.5 cursor-pointer"
              >
                {/* Top Row: Index + Status Pill */}
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-inkSoft uppercase tracking-wider">
                    Prompt {idx + 1}
                  </span>

                  {/* Status pill: "Answered" or "Your turn" or "Waiting" */}
                  {status === "answered" && (
                    <span className="text-[11px] font-medium py-0.5 px-2.5 rounded-full bg-[#DDF2E6] text-[#2C6E49] border border-[#BCE7CE]">
                      Answered
                    </span>
                  )}
                  {status === "your_turn" && (
                    <span className="text-[11px] font-medium py-0.5 px-2.5 rounded-full bg-[#FFC2CE] text-[#E84367] border border-[#FFAEBE] animate-pulse">
                      Your turn
                    </span>
                  )}
                  {status === "waiting" && (
                    <span className="text-[11px] font-medium py-0.5 px-2.5 rounded-full bg-canvas text-inkSoft border border-border">
                      Waiting
                    </span>
                  )}
                </div>

                {/* Question: 16px serif */}
                <p className="font-heading text-[16px] text-ink leading-snug">
                  {p.prompt_text}
                </p>

                {/* Action button row: Button EXACT "Answer Together" */}
                <div className="pt-1 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenPrompt(p);
                    }}
                    className={cn(
                      "h-9 px-4 rounded-full text-xs font-medium transition-all flex items-center space-x-1.5",
                      status === "your_turn"
                        ? "bg-primary hover:bg-deep text-white shadow-xs"
                        : status === "answered"
                        ? "bg-canvas hover:bg-blush/30 text-ink border border-border"
                        : "bg-canvas hover:bg-blush/20 text-ink border border-border"
                    )}
                  >
                    <MessageCircle size={13} strokeWidth={1.5} />
                    <span>Answer Together</span>
                  </button>

                  {status === "your_turn" && (
                    <span className="text-[11px] text-primary font-medium">
                      {partnerName} is waiting
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Answering & Reveal Bottom Sheet */}
      <TalkAnswerSheet
        isOpen={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
        prompt={activePrompt}
        deckTitle={deck?.title || "Talk Prompt"}
        currentUserId={currentUserId}
        currentUserName={currentUserName}
        partnerId={partnerId}
        partnerName={partnerName}
        myAnswer={activeAnswers?.myAns || null}
        partnerAnswer={activeAnswers?.partnerAns || null}
        onSubmitAnswer={handleSubmitAnswer}
        onSaveToSpace={handleSaveToSpace}
        isSavedToSpace={Boolean(activePrompt && savedPrompts[activePrompt.id])}
        isIntimacyDeck={Boolean(deck?.is_intimacy)}
      />

      {/* Romance Idea Generator Modal */}
      <RomanceIdeaModal
        isOpen={isIdeaModalOpen}
        onClose={() => setIsIdeaModalOpen(false)}
        coupleId={coupleId}
        authorId={currentUserId}
        authorName={currentUserName}
      />

      {/* Monetization Paywall Modal */}
      <Paywall
        isOpen={isPaywallOpen}
        onClose={() => setIsPaywallOpen(false)}
        coupleId={coupleId}
        currentUserId={currentUserId}
        reason="talk_limit"
        onUpgraded={() => setIsPremium(true)}
      />
    </div>
  );
}

export default function TalkDeckDetailPage() {
  return (
    <React.Suspense
      fallback={
        <div className="py-12 text-center text-xs text-inkSoft">
          Loading conversation deck...
        </div>
      }
    >
      <TalkDeckDetailContent />
    </React.Suspense>
  );
}
