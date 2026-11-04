"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Sparkles,
  Check,
  CheckCircle2,
  BookOpen,
  RefreshCw,
  Heart,
} from "lucide-react";
import { Pill } from "@/components/ui/pill";
import { Card } from "@/components/ui/card";
import { supabase } from "@/lib/supabase/client";
import { BIBLE_TRIVIA_QUESTIONS } from "@/lib/game-prompts";
import { cn } from "@/lib/utils";

interface BibleTriviaGameProps {
  game: any;
  coupleId: string;
  currentUserId: string;
  currentUserName: string;
  partnerId: string;
  partnerName: string;
}

export function BibleTriviaGame({
  game,
  coupleId,
  currentUserId,
  currentUserName,
  partnerId,
  partnerName,
}: BibleTriviaGameProps) {
  const [roundIndex, setRoundIndex] = React.useState<number>(0);
  const [myAnswer, setMyAnswer] = React.useState<number | null>(null);
  const [partnerAnswer, setPartnerAnswer] = React.useState<number | null>(null);
  const [activePlayId, setActivePlayId] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState<boolean>(false);
  const [savedToSpace, setSavedToSpace] = React.useState<boolean>(false);
  const [loading, setLoading] = React.useState<boolean>(true);

  const currentQuestion = BIBLE_TRIVIA_QUESTIONS[roundIndex] || BIBLE_TRIVIA_QUESTIONS[0];
  const isBothAnswered = myAnswer !== null && partnerAnswer !== null;

  // Load existing game state from game_plays
  const loadTriviaData = React.useCallback(async () => {
    if (!coupleId || !game?.id) return;

    try {
      const { data, error } = await supabase
        .from("game_plays")
        .select("*")
        .eq("couple_id", coupleId)
        .eq("game_id", game.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) {
        setActivePlayId(data.id);
        const playData = (data.data as any) || {};

        if (typeof playData.round_index === "number") {
          setRoundIndex(playData.round_index);
        }

        const answers = playData.trivia_answers || {};
        if (currentUserId && typeof answers[currentUserId] === "number") {
          setMyAnswer(answers[currentUserId]);
        } else {
          setMyAnswer(null);
        }
        if (partnerId && typeof answers[partnerId] === "number") {
          setPartnerAnswer(answers[partnerId]);
        } else {
          setPartnerAnswer(null);
        }
      }
    } catch (err) {
      console.error("Failed to load trivia play:", err);
    } finally {
      setLoading(false);
    }
  }, [coupleId, game?.id, currentUserId, partnerId]);

  React.useEffect(() => {
    loadTriviaData();
  }, [loadTriviaData]);

  // Realtime subscription
  React.useEffect(() => {
    if (!coupleId || !game?.id) return;

    const channel = supabase
      .channel(`realtime-trivia-play-${coupleId}-${game.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "game_plays",
          filter: `couple_id=eq.${coupleId}`,
        },
        (payload) => {
          const row = (payload.new || payload.old) as any;
          if (!row || row.game_id !== game.id) return;

          setActivePlayId(row.id);
          const playData = (row.data as any) || {};

          if (typeof playData.round_index === "number") {
            setRoundIndex(playData.round_index);
          }

          const answers = playData.trivia_answers || {};
          if (currentUserId && typeof answers[currentUserId] === "number") {
            setMyAnswer(answers[currentUserId]);
          } else {
            setMyAnswer(null);
          }
          if (partnerId && typeof answers[partnerId] === "number") {
            setPartnerAnswer(answers[partnerId]);
          } else {
            setPartnerAnswer(null);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [coupleId, game?.id, currentUserId, partnerId]);

  // Handle selecting an option
  const handleSelectOption = async (optionIndex: number) => {
    if (!coupleId || !game?.id || !currentUserId || isSubmitting || isBothAnswered) return;
    if (myAnswer !== null) return; // already locked in for this round

    setIsSubmitting(true);
    setMyAnswer(optionIndex);

    try {
      const { data: existing } = await supabase
        .from("game_plays")
        .select("*")
        .eq("couple_id", coupleId)
        .eq("game_id", game.id)
        .maybeSingle();

      const existingData = (existing?.data as any) || {};
      const currentAnswers = existingData.trivia_answers || {};

      const updatedAnswers = {
        ...currentAnswers,
        [currentUserId]: optionIndex,
      };

      const updatedPayload = {
        ...existingData,
        type: "trivia",
        round_index: roundIndex,
        trivia_answers: updatedAnswers,
      };

      if (existing) {
        await supabase
          .from("game_plays")
          .update({ data: updatedPayload as any })
          .eq("id", existing.id);
      } else {
        const { data: newRow } = await supabase
          .from("game_plays")
          .insert({
            couple_id: coupleId,
            game_id: game.id,
            data: updatedPayload as any,
          })
          .select("id")
          .single();

        if (newRow) setActivePlayId(newRow.id);
      }
    } catch (err) {
      console.error("Failed to save trivia answer:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Next question
  const handleNextQuestion = async () => {
    if (!coupleId || !game?.id) return;
    const nextRound = (roundIndex + 1) % BIBLE_TRIVIA_QUESTIONS.length;

    setRoundIndex(nextRound);
    setMyAnswer(null);
    setPartnerAnswer(null);
    setSavedToSpace(false);

    try {
      const { data: existing } = await supabase
        .from("game_plays")
        .select("*")
        .eq("couple_id", coupleId)
        .eq("game_id", game.id)
        .maybeSingle();

      const existingData = (existing?.data as any) || {};
      const updatedPayload = {
        ...existingData,
        type: "trivia",
        round_index: nextRound,
        trivia_answers: {},
      };

      if (existing) {
        await supabase
          .from("game_plays")
          .update({ data: updatedPayload as any })
          .eq("id", existing.id);
      }
    } catch (err) {
      console.error("Failed to advance trivia question:", err);
    }
  };

  // Save moment to Our Space
  const handleSaveToSpace = async () => {
    if (!coupleId || !currentUserId || savedToSpace) return;

    try {
      const q = currentQuestion;
      const myPickText = myAnswer !== null ? q.options[myAnswer] : "—";
      const partnerPickText = partnerAnswer !== null ? q.options[partnerAnswer] : "—";

      const contentPayload = {
        game_title: "Bible Trivia for Two",
        is_trivia: true,
        question: q.question,
        result_text: "You both learned!",
        explanation: q.explanation,
        partner_a: currentUserName,
        pick_a: myPickText,
        partner_b: partnerName,
        pick_b: partnerPickText,
        correct_answer: q.options[q.correctIndex],
      };

      await supabase.from("moments").insert({
        couple_id: coupleId,
        author_id: currentUserId,
        type: "game",
        content: JSON.stringify(contentPayload),
      });

      setSavedToSpace(true);
    } catch (err) {
      console.error("Failed to save trivia moment:", err);
    }
  };

  if (loading) {
    return <div className="py-20 text-center text-xs text-inkSoft">Loading Bible Trivia...</div>;
  }

  const progressPercent = ((roundIndex + 1) / BIBLE_TRIVIA_QUESTIONS.length) * 100;

  return (
    <div className="space-y-6 pb-20">
      {/* Back button */}
      <Link
        href="/games"
        className="inline-flex items-center space-x-1.5 text-xs text-inkSoft hover:text-ink transition-colors"
      >
        <ArrowLeft size={16} strokeWidth={1.5} />
        <span>All Games</span>
      </Link>

      {/* Top Header */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center shadow-xs">
              <Image
                src="/icons/games/trivia.svg"
                alt="Bible Trivia"
                width={36}
                height={36}
                className="w-9 h-9 object-contain"
              />
            </div>
            <div>
              <h1 className="font-heading text-2xl text-ink font-normal leading-tight">
                Bible Trivia for Two
              </h1>
              <span className="text-[11px] text-inkSoft">Love, Covenant & Purpose</span>
            </div>
          </div>
          <span className="text-xs text-inkSoft font-medium">
            {roundIndex + 1} of {BIBLE_TRIVIA_QUESTIONS.length}
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-full h-1 bg-border rounded-full overflow-hidden">
          <div
            className="h-1 rounded-full bg-primary transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Main Question Card: White 24px radius, shadow */}
      <Card className="rounded-[24px] bg-white border border-border p-6 shadow-[0_8px_32px_rgba(255,90,126,0.08)] space-y-6">
        <div className="text-center space-y-1 py-1">
          <Pill className="text-[10px] py-0.5 px-2.5">Scripture Question</Pill>
          <h2 className="font-heading text-xl sm:text-2xl text-ink font-normal leading-relaxed pt-1">
            &ldquo;{currentQuestion.question}&rdquo;
          </h2>
        </div>

        {/* 4 Options as Selectable Pills, Rose when selected */}
        <div className="space-y-2.5">
          {currentQuestion.options.map((optionText, idx) => {
            const isMyPick = myAnswer === idx;
            const isPartnerPick = partnerAnswer === idx;
            const isCorrectOption = currentQuestion.correctIndex === idx;

            // Option styling depending on state
            let pillClass = "bg-white hover:bg-blush/20 border-border text-ink";

            if (isBothAnswered) {
              if (isCorrectOption) {
                pillClass = "bg-[#DDF2E6] text-[#2C6E49] border-[#BCE7CE] font-semibold";
              } else if (isMyPick || isPartnerPick) {
                pillClass = "bg-[#FFC2CE]/30 border-primary/20 text-ink line-through decoration-inkSoft/40";
              } else {
                pillClass = "bg-canvas/50 text-inkSoft border-border opacity-70";
              }
            } else if (isMyPick) {
              pillClass = "bg-primary text-white border-primary shadow-[0_8px_32px_rgba(255,90,126,0.2)]";
            }

            return (
              <button
                key={idx}
                type="button"
                disabled={myAnswer !== null || isBothAnswered}
                onClick={() => handleSelectOption(idx)}
                className={cn(
                  "w-full min-h-[50px] px-5 py-3 rounded-full text-xs sm:text-sm font-medium border text-left transition-all active:scale-[0.99] select-none flex items-center justify-between",
                  pillClass
                )}
              >
                <span className="leading-snug">{optionText}</span>

                {/* Badges / indicators */}
                <div className="flex items-center space-x-1.5 shrink-0 ml-2">
                  {isBothAnswered ? (
                    isCorrectOption ? (
                      <span className="w-5 h-5 rounded-full bg-[#2C6E49] text-white flex items-center justify-center text-[10px]">
                        <Check size={12} strokeWidth={2.5} />
                      </span>
                    ) : null
                  ) : isMyPick ? (
                    <span className="w-5 h-5 rounded-full bg-white/20 text-white flex items-center justify-center text-[10px]">
                      <Check size={12} strokeWidth={2.5} />
                    </span>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>

        {/* Reveal or Waiting Section */}
        <AnimatePresence mode="wait">
          {isBothAnswered ? (
            /* REVEAL STATE */
            <motion.div
              key="reveal"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4 pt-1"
            >
              {/* Score / Gentle Banner: Score not competitive shaming, text "You both learned!" */}
              <div className="p-4 rounded-[20px] bg-[#DDF2E6]/60 border border-[#BCE7CE] text-center space-y-1">
                <div className="flex items-center justify-center space-x-1.5 font-heading text-xl text-[#2C6E49]">
                  <CheckCircle2 size={18} strokeWidth={1.5} />
                  <span>You both learned!</span>
                </div>
                <p className="text-xs text-inkSoft font-body">
                  Correct Answer: &ldquo;{currentQuestion.options[currentQuestion.correctIndex]}&rdquo;
                </p>
              </div>

              {/* Short Scripture Explanation */}
              <div className="p-3.5 rounded-[18px] bg-canvas border border-border text-xs space-y-1">
                <div className="flex items-center space-x-1 text-primary font-semibold text-[10px] uppercase tracking-wider">
                  <BookOpen size={12} strokeWidth={1.5} />
                  <span>Scripture Insight</span>
                </div>
                <p className="text-inkSoft leading-relaxed font-body">
                  {currentQuestion.explanation}
                </p>
              </div>

              {/* Both Picks side by side */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-[16px] bg-canvas border border-border text-center space-y-1">
                  <span className="text-[10px] text-primary font-semibold uppercase tracking-wider block">
                    You Chose
                  </span>
                  <p className="font-medium text-ink">
                    {myAnswer !== null ? currentQuestion.options[myAnswer] : "—"}
                  </p>
                </div>

                <div className="p-3 rounded-[16px] bg-blush/20 border border-blush/40 text-center space-y-1">
                  <span className="text-[10px] text-deep font-semibold uppercase tracking-wider block">
                    {partnerName} Chose
                  </span>
                  <p className="font-medium text-ink">
                    {partnerAnswer !== null ? currentQuestion.options[partnerAnswer] : "—"}
                  </p>
                </div>
              </div>

              {/* Action Buttons: Button Save to Space & Next Question */}
              <div className="pt-2 space-y-2">
                <button
                  type="button"
                  onClick={handleSaveToSpace}
                  disabled={savedToSpace}
                  className={cn(
                    "w-full h-12 rounded-full font-medium text-xs transition-all flex items-center justify-center space-x-2 shadow-xs active:scale-[0.99]",
                    savedToSpace
                      ? "bg-[#DDF2E6] text-[#2C6E49] border border-[#BCE7CE]"
                      : "bg-white hover:bg-canvas text-ink border border-border"
                  )}
                >
                  {savedToSpace ? (
                    <>
                      <Check size={16} strokeWidth={1.5} />
                      <span>Saved to Space ✓</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} strokeWidth={1.5} className="text-primary" />
                      <span>Save to Space</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleNextQuestion}
                  className="w-full h-12 rounded-full bg-primary hover:bg-deep text-white font-medium text-xs transition-all shadow-[0_8px_32px_rgba(255,90,126,0.15)] active:scale-[0.99]"
                >
                  Next Question &rarr;
                </button>
              </div>
            </motion.div>
          ) : (
            /* WAITING STATE */
            <motion.div
              key="waiting"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-2 space-y-2"
            >
              {myAnswer !== null ? (
                <div className="flex items-center justify-center space-x-2 text-xs text-primary font-medium animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-primary" />
                  <span>
                    Answer locked! Waiting for {partnerName} to pick...
                  </span>
                </div>
              ) : partnerAnswer !== null ? (
                <div className="flex items-center justify-center space-x-2 text-xs text-deep font-medium">
                  <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  <span>{partnerName} has answered! Pick your option above.</span>
                </div>
              ) : (
                <p className="text-xs text-inkSoft">
                  Select one option above to lock in your answer together.
                </p>
              )}

              {/* Skip button always available */}
              <button
                type="button"
                onClick={handleNextQuestion}
                className="inline-flex items-center space-x-1.5 text-xs text-inkSoft hover:text-ink transition-colors pt-2"
              >
                <RefreshCw size={13} strokeWidth={1.5} />
                <span>Skip Question</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </div>
  );
}
