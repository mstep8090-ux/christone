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
  HelpCircle,
  Edit3,
  Heart,
  Play,
  RotateCcw,
} from "lucide-react";
import { Pill } from "@/components/ui/pill";
import { Card } from "@/components/ui/card";
import { supabase } from "@/lib/supabase/client";
import { DEFAULT_QUIZ_TEMPLATES, type QuizQuestion } from "@/lib/game-prompts";
import { cn } from "@/lib/utils";

interface QuizGameProps {
  game: any;
  coupleId: string;
  currentUserId: string;
  currentUserName: string;
  partnerId: string;
  partnerName: string;
}

export function QuizGame({
  game,
  coupleId,
  currentUserId,
  currentUserName,
  partnerId,
  partnerName,
}: QuizGameProps) {
  // Mode: "dashboard" | "create" | "play" | "result"
  const [mode, setMode] = React.useState<"dashboard" | "create" | "play" | "result">("dashboard");
  const [loading, setLoading] = React.useState(true);
  const [activePlayId, setActivePlayId] = React.useState<string | null>(null);

  // Stored quiz payloads
  const [myQuiz, setMyQuiz] = React.useState<{
    questions: QuizQuestion[];
    creator_name: string;
    created_at: string;
  } | null>(null);
  const [partnerQuiz, setPartnerQuiz] = React.useState<{
    questions: QuizQuestion[];
    creator_name: string;
    created_at: string;
  } | null>(null);
  const [myAttempt, setMyAttempt] = React.useState<{
    answers: number[];
    score: number;
    completed_at: string;
  } | null>(null);
  const [partnerAttempt, setPartnerAttempt] = React.useState<{
    answers: number[];
    score: number;
    completed_at: string;
  } | null>(null);

  // Creator state (5 questions)
  const [editingQuestions, setEditingQuestions] = React.useState<QuizQuestion[]>(DEFAULT_QUIZ_TEMPLATES);
  const [createStep, setCreateStep] = React.useState<number>(0);
  const [isSavingQuiz, setIsSavingQuiz] = React.useState(false);

  // Playing state
  const [activeQuestionIndex, setActiveQuestionIndex] = React.useState<number>(0);
  const [selectedAnswers, setSelectedAnswers] = React.useState<number[]>([]);
  const [currentSelectedOption, setCurrentSelectedOption] = React.useState<number | null>(null);
  const [savedToSpace, setSavedToSpace] = React.useState(false);

  // Load existing quiz data from game_plays
  const loadQuizData = React.useCallback(async () => {
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
        const quizzes = playData.quizzes || {};
        const attempts = playData.attempts || {};

        if (currentUserId && quizzes[currentUserId]) {
          setMyQuiz(quizzes[currentUserId]);
          if (quizzes[currentUserId]?.questions?.length === 5) {
            setEditingQuestions(quizzes[currentUserId].questions);
          }
        }
        if (partnerId && quizzes[partnerId]) {
          setPartnerQuiz(quizzes[partnerId]);
        }
        if (currentUserId && attempts[currentUserId]) {
          setMyAttempt(attempts[currentUserId]);
        }
        if (partnerId && attempts[partnerId]) {
          setPartnerAttempt(attempts[partnerId]);
        }
      }
    } catch (err) {
      console.error("Failed to load quiz data:", err);
    } finally {
      setLoading(false);
    }
  }, [coupleId, game?.id, currentUserId, partnerId]);

  React.useEffect(() => {
    loadQuizData();
  }, [loadQuizData]);

  // Realtime subscription
  React.useEffect(() => {
    if (!coupleId || !game?.id) return;

    const channel = supabase
      .channel(`realtime-quiz-play-${coupleId}-${game.id}`)
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
          const quizzes = playData.quizzes || {};
          const attempts = playData.attempts || {};

          if (currentUserId && quizzes[currentUserId]) {
            setMyQuiz(quizzes[currentUserId]);
          }
          if (partnerId && quizzes[partnerId]) {
            setPartnerQuiz(quizzes[partnerId]);
          }
          if (currentUserId && attempts[currentUserId]) {
            setMyAttempt(attempts[currentUserId]);
          }
          if (partnerId && attempts[partnerId]) {
            setPartnerAttempt(attempts[partnerId]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [coupleId, game?.id, currentUserId, partnerId]);

  // CREATOR HANDLERS
  const handleUpdateQuestionText = (text: string) => {
    setEditingQuestions((prev) => {
      const copy = [...prev];
      copy[createStep] = { ...copy[createStep], question: text };
      return copy;
    });
  };

  const handleUpdateOptionText = (optionIndex: number, text: string) => {
    setEditingQuestions((prev) => {
      const copy = [...prev];
      const opts = [...copy[createStep].options] as [string, string, string, string];
      opts[optionIndex] = text;
      copy[createStep] = { ...copy[createStep], options: opts };
      return copy;
    });
  };

  const handleSetCorrectIndex = (optionIndex: number) => {
    setEditingQuestions((prev) => {
      const copy = [...prev];
      copy[createStep] = { ...copy[createStep], correctIndex: optionIndex };
      return copy;
    });
  };

  const handleSaveQuiz = async () => {
    if (!coupleId || !game?.id || !currentUserId) return;
    setIsSavingQuiz(true);
    try {
      // Fetch latest game play
      const { data: existing } = await supabase
        .from("game_plays")
        .select("*")
        .eq("couple_id", coupleId)
        .eq("game_id", game.id)
        .maybeSingle();

      const existingData = (existing?.data as any) || {};
      const updatedQuizzes = {
        ...(existingData.quizzes || {}),
        [currentUserId]: {
          creator_id: currentUserId,
          creator_name: currentUserName,
          created_at: new Date().toISOString(),
          questions: editingQuestions,
        },
      };

      const updatedPayload = {
        ...existingData,
        type: "quiz",
        quizzes: updatedQuizzes,
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

      setMyQuiz({
        creator_name: currentUserName,
        created_at: new Date().toISOString(),
        questions: editingQuestions,
      });

      setMode("dashboard");
    } catch (err) {
      console.error("Failed to save quiz:", err);
    } finally {
      setIsSavingQuiz(false);
    }
  };

  // GUESSER / PLAY HANDLERS
  const startPlayingPartnerQuiz = () => {
    setActiveQuestionIndex(0);
    setSelectedAnswers([]);
    setCurrentSelectedOption(null);
    setSavedToSpace(false);
    setMode("play");
  };

  const handleSelectOption = (idx: number) => {
    setCurrentSelectedOption(idx);
  };

  const handleNextGuessQuestion = async () => {
    if (currentSelectedOption === null || !partnerQuiz) return;

    const newAnswers = [...selectedAnswers, currentSelectedOption];
    setSelectedAnswers(newAnswers);
    setCurrentSelectedOption(null);

    if (activeQuestionIndex < 4) {
      setActiveQuestionIndex((prev) => prev + 1);
    } else {
      // Completed all 5 questions! Calculate score
      let calculatedScore = 0;
      partnerQuiz.questions.forEach((q, i) => {
        if (newAnswers[i] === q.correctIndex) {
          calculatedScore += 1;
        }
      });

      const attemptRecord = {
        answers: newAnswers,
        score: calculatedScore,
        completed_at: new Date().toISOString(),
      };
      setMyAttempt(attemptRecord);

      // Save attempt to game_plays
      try {
        const { data: existing } = await supabase
          .from("game_plays")
          .select("*")
          .eq("couple_id", coupleId)
          .eq("game_id", game.id)
          .maybeSingle();

        const existingData = (existing?.data as any) || {};
        const updatedAttempts = {
          ...(existingData.attempts || {}),
          [currentUserId]: attemptRecord,
        };

        const targetPlayId = existing?.id || activePlayId;
        if (targetPlayId) {
          await supabase
            .from("game_plays")
            .update({
              data: {
                ...existingData,
                attempts: updatedAttempts,
              } as any,
            })
            .eq("id", targetPlayId);
        }
      } catch (err) {
        console.error("Failed to save quiz attempt:", err);
      }

      setMode("result");
    }
  };

  // Save quiz result to Our Space feed
  const handleSaveResultToSpace = async () => {
    if (!coupleId || !currentUserId || !myAttempt || !partnerQuiz) return;
    try {
      const score = myAttempt.score;
      let celebration = "You know each other so deeply! Celebrate how much you cherish one another.";
      if (score === 5) {
        celebration = "A perfect 5 out of 5! Two hearts truly walking as one.";
      } else if (score >= 3) {
        celebration = "A sweet bond! Filled with warmth, understanding, and joy.";
      } else {
        celebration = "Every question is a wonderful opportunity to learn each other deeper.";
      }

      const contentPayload = {
        game_title: "How Well Do You Know Me",
        is_quiz: true,
        question: `How well does ${currentUserName} know ${partnerName}?`,
        score_text: `${score} / 5 Correct`,
        creator_name: partnerName,
        celebration,
      };

      await supabase.from("moments").insert({
        couple_id: coupleId,
        author_id: currentUserId,
        type: "game",
        content: JSON.stringify(contentPayload),
      });

      setSavedToSpace(true);
    } catch (err) {
      console.error("Failed to save quiz moment:", err);
    }
  };

  if (loading) {
    return <div className="py-20 text-center text-xs text-inkSoft">Loading quiz...</div>;
  }

  // 1. DASHBOARD MODE
  if (mode === "dashboard") {
    return (
      <div className="space-y-6 pb-20">
        <Link
          href="/games"
          className="inline-flex items-center space-x-1.5 text-xs text-inkSoft hover:text-ink transition-colors"
        >
          <ArrowLeft size={16} strokeWidth={1.5} />
          <span>All Games</span>
        </Link>

        {/* Header */}
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center shadow-xs">
            <Image
              src="/icons/games/quiz.svg"
              alt="Quiz"
              width={48}
              height={48}
              className="w-12 h-12 object-contain"
            />
          </div>
          <div>
            <Pill className="text-[10px] py-0.5 px-2">Couple Quiz</Pill>
            <h1 className="font-heading text-2xl text-ink font-normal pt-0.5">
              How Well Do You Know Me?
            </h1>
          </div>
        </div>

        {/* Card 1: Partner's Quiz (To Guess) */}
        {partnerQuiz ? (
          <Card className="rounded-[24px] bg-white border border-border p-5 shadow-[0_8px_32px_rgba(255,90,126,0.08)] space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Heart size={16} strokeWidth={1.5} className="text-primary" />
                <span className="text-xs font-semibold text-ink">
                  {partnerName}&apos;s Quiz for You
                </span>
              </div>
              <span className="text-[11px] text-inkSoft">5 Questions</span>
            </div>

            {myAttempt ? (
              <div className="p-4 rounded-[18px] bg-[#DDF2E6]/50 border border-[#BCE7CE] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#2C6E49]">
                    Your Score: {myAttempt.score} / 5 Correct
                  </span>
                  <CheckCircle2 size={16} strokeWidth={1.5} className="text-[#2C6E49]" />
                </div>
                <p className="text-xs text-inkSoft leading-relaxed">
                  You took {partnerName}&apos;s quiz! Want to review your answers or try again?
                </p>
                <div className="pt-1 flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedAnswers(myAttempt.answers);
                      setMode("result");
                    }}
                    className="flex-1 h-9 rounded-full bg-white border border-[#BCE7CE] text-xs font-medium text-[#2C6E49] hover:bg-canvas transition-colors"
                  >
                    View Score Details
                  </button>
                  <button
                    type="button"
                    onClick={startPlayingPartnerQuiz}
                    className="h-9 px-3 rounded-full bg-white border border-border text-xs text-inkSoft hover:text-ink transition-colors flex items-center space-x-1"
                  >
                    <RotateCcw size={12} strokeWidth={1.5} />
                    <span>Retake</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-inkSoft leading-relaxed">
                  {partnerName} created a 5-question quiz about their favorites, habits, and heart. Can you guess all 5?
                </p>
                <button
                  type="button"
                  onClick={startPlayingPartnerQuiz}
                  className="w-full h-11 rounded-full bg-primary hover:bg-deep text-white font-medium text-xs transition-all flex items-center justify-center space-x-2 shadow-xs active:scale-[0.99]"
                >
                  <Play size={14} strokeWidth={1.5} />
                  <span>Take {partnerName}&apos;s Quiz</span>
                </button>
              </div>
            )}
          </Card>
        ) : (
          <Card className="rounded-[24px] bg-white border border-border p-5 shadow-[0_8px_32px_rgba(255,90,126,0.08)] space-y-2 text-center py-6">
            <HelpCircle size={28} strokeWidth={1.5} className="mx-auto text-primary/70" />
            <h3 className="font-heading text-lg text-ink">Waiting for {partnerName}&apos;s Quiz</h3>
            <p className="text-xs text-inkSoft max-w-xs mx-auto leading-relaxed">
              When {partnerName} creates their quiz, you can guess their favorite things here!
            </p>
          </Card>
        )}

        {/* Card 2: Your Quiz (Creator Flow) */}
        <Card className="rounded-[24px] bg-white border border-border p-5 shadow-[0_8px_32px_rgba(255,90,126,0.08)] space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Edit3 size={16} strokeWidth={1.5} className="text-primary" />
              <span className="text-xs font-semibold text-ink">Your Quiz for {partnerName}</span>
            </div>
            {myQuiz && <span className="text-[11px] text-[#2C6E49] font-medium">Ready ✓</span>}
          </div>

          {myQuiz ? (
            <div className="space-y-3">
              <div className="p-3.5 rounded-[18px] bg-blush/20 border border-blush/30 text-xs space-y-1">
                <span className="font-medium text-ink block">Your 5 questions are saved!</span>
                {partnerAttempt ? (
                  <p className="text-primary font-medium">
                    {partnerName} guessed your quiz and scored {partnerAttempt.score} / 5!
                  </p>
                ) : (
                  <p className="text-inkSoft">
                    Waiting for {partnerName} to answer your quiz.
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  setCreateStep(0);
                  setMode("create");
                }}
                className="w-full h-11 rounded-full bg-white hover:bg-canvas text-ink border border-border font-medium text-xs transition-colors flex items-center justify-center space-x-1.5"
              >
                <Edit3 size={14} strokeWidth={1.5} />
                <span>Edit Your 5 Questions</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-inkSoft leading-relaxed">
                Create 5 multiple-choice questions about your favorite comfort food, dreams, and spiritual moments for {partnerName} to guess.
              </p>
              <button
                type="button"
                onClick={() => {
                  setCreateStep(0);
                  setMode("create");
                }}
                className="w-full h-11 rounded-full bg-primary hover:bg-deep text-white font-medium text-xs transition-all flex items-center justify-center space-x-2 shadow-xs active:scale-[0.99]"
              >
                <Sparkles size={14} strokeWidth={1.5} />
                <span>Create Your Quiz</span>
              </button>
            </div>
          )}
        </Card>
      </div>
    );
  }

  // 2. CREATOR MODE: User creates 5 Q&A about self
  if (mode === "create") {
    const currentQ = editingQuestions[createStep];
    const isLastQuestion = createStep === 4;

    return (
      <div className="space-y-6 pb-20">
        <button
          type="button"
          onClick={() => setMode("dashboard")}
          className="inline-flex items-center space-x-1.5 text-xs text-inkSoft hover:text-ink transition-colors"
        >
          <ArrowLeft size={16} strokeWidth={1.5} />
          <span>Exit Creator</span>
        </button>

        <div className="flex items-center justify-between">
          <div>
            <Pill className="text-[10px] py-0.5 px-2">Quiz Creator</Pill>
            <h1 className="font-heading text-2xl text-ink font-normal pt-0.5">
              Question {createStep + 1} of 5
            </h1>
          </div>
          <span className="text-xs text-inkSoft font-medium">{createStep + 1}/5</span>
        </div>

        {/* Progress bar */}
        <div className="w-full h-1 bg-border rounded-full overflow-hidden">
          <div
            className="h-1 rounded-full bg-primary transition-all duration-300"
            style={{ width: `${((createStep + 1) / 5) * 100}%` }}
          />
        </div>

        {/* Question Card: White 24px radius */}
        <Card className="rounded-[24px] bg-white border border-border p-6 shadow-[0_8px_32px_rgba(255,90,126,0.08)] space-y-5">
          {/* Question Input */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-inkSoft uppercase tracking-wider block">
              Question about you
            </label>
            <input
              type="text"
              value={currentQ.question}
              onChange={(e) => handleUpdateQuestionText(e.target.value)}
              placeholder="e.g. What is my favorite food?"
              className="w-full h-12 px-4 rounded-[16px] border border-border bg-canvas text-sm text-ink placeholder:text-inkSoft/50 focus:outline-none focus:border-primary transition-colors font-body"
            />
          </div>

          {/* Options with Selectable Correct Answer Pill */}
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold text-inkSoft uppercase tracking-wider">
                Options (Tap pill to mark your true answer)
              </label>
            </div>

            <div className="space-y-2.5">
              {currentQ.options.map((opt, optIdx) => {
                const isCorrect = currentQ.correctIndex === optIdx;

                return (
                  <div
                    key={optIdx}
                    className={cn(
                      "flex items-center gap-2 p-2 rounded-[20px] border transition-all",
                      isCorrect ? "bg-blush/20 border-primary" : "bg-white border-border"
                    )}
                  >
                    {/* Correct Indicator / Selectable Pill */}
                    <button
                      type="button"
                      onClick={() => handleSetCorrectIndex(optIdx)}
                      className={cn(
                        "h-8 px-3 rounded-full text-[11px] font-medium transition-all shrink-0 flex items-center space-x-1 select-none",
                        isCorrect
                          ? "bg-primary text-white shadow-xs"
                          : "bg-canvas text-inkSoft hover:text-ink border border-border"
                      )}
                    >
                      {isCorrect ? (
                        <>
                          <Check size={12} strokeWidth={2} />
                          <span>Correct</span>
                        </>
                      ) : (
                        <span>Pick</span>
                      )}
                    </button>

                    <input
                      type="text"
                      value={opt}
                      onChange={(e) => handleUpdateOptionText(optIdx, e.target.value)}
                      placeholder={`Option ${optIdx + 1}`}
                      className="flex-1 h-9 px-2 bg-transparent text-xs text-ink focus:outline-none font-body"
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center gap-3 pt-3">
            {createStep > 0 && (
              <button
                type="button"
                onClick={() => setCreateStep((prev) => prev - 1)}
                className="h-12 px-5 rounded-full border border-border bg-white hover:bg-canvas text-ink text-xs font-medium transition-colors"
              >
                Previous
              </button>
            )}

            {isLastQuestion ? (
              <button
                type="button"
                disabled={isSavingQuiz}
                onClick={handleSaveQuiz}
                className="flex-1 h-12 rounded-full bg-primary hover:bg-deep text-white text-xs font-medium transition-all flex items-center justify-center space-x-2 shadow-xs active:scale-[0.99]"
              >
                {isSavingQuiz ? (
                  <span>Saving Quiz...</span>
                ) : (
                  <>
                    <Check size={16} strokeWidth={1.5} />
                    <span>Save & Share with {partnerName}</span>
                  </>
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setCreateStep((prev) => prev + 1)}
                className="flex-1 h-12 rounded-full bg-primary hover:bg-deep text-white text-xs font-medium transition-all shadow-xs active:scale-[0.99]"
              >
                Next Question &rarr;
              </button>
            )}
          </div>
        </Card>
      </div>
    );
  }

  // 3. GUESSER / PLAY MODE: Partner guesses multiple choice
  if (mode === "play") {
    if (!partnerQuiz) return null;
    const currentQ = partnerQuiz.questions[activeQuestionIndex];
    const isLastQ = activeQuestionIndex === 4;

    return (
      <div className="space-y-6 pb-20">
        <button
          type="button"
          onClick={() => setMode("dashboard")}
          className="inline-flex items-center space-x-1.5 text-xs text-inkSoft hover:text-ink transition-colors"
        >
          <ArrowLeft size={16} strokeWidth={1.5} />
          <span>Exit Quiz</span>
        </button>

        <div className="flex items-center justify-between">
          <div>
            <Pill className="text-[10px] py-0.5 px-2">Guessing {partnerName}</Pill>
            <h1 className="font-heading text-2xl text-ink font-normal pt-0.5">
              Question {activeQuestionIndex + 1} of 5
            </h1>
          </div>
          <span className="text-xs text-inkSoft font-medium">{activeQuestionIndex + 1}/5</span>
        </div>

        {/* Progress bar */}
        <div className="w-full h-1 bg-border rounded-full overflow-hidden">
          <div
            className="h-1 rounded-full bg-primary transition-all duration-300"
            style={{ width: `${((activeQuestionIndex + 1) / 5) * 100}%` }}
          />
        </div>

        {/* Question Card: White 24px radius */}
        <Card className="rounded-[24px] bg-white border border-border p-6 shadow-[0_8px_32px_rgba(255,90,126,0.08)] space-y-6">
          <div className="text-center space-y-1 py-1">
            <span className="text-[11px] text-inkSoft uppercase tracking-wider block font-semibold">
              Guess {partnerName}&apos;s Pick
            </span>
            <h2 className="font-heading text-xl sm:text-2xl text-ink font-normal leading-relaxed">
              &ldquo;{currentQ.question}&rdquo;
            </h2>
          </div>

          {/* Options as Selectable Pills, Rose when selected */}
          <div className="space-y-2.5">
            {currentQ.options.map((optionText, optIdx) => {
              const isSelected = currentSelectedOption === optIdx;

              return (
                <button
                  key={optIdx}
                  type="button"
                  onClick={() => handleSelectOption(optIdx)}
                  className={cn(
                    "w-full min-h-[50px] px-5 py-3 rounded-full text-xs sm:text-sm font-medium border text-left transition-all active:scale-[0.99] select-none flex items-center justify-between",
                    isSelected
                      ? "bg-primary text-white border-primary shadow-[0_8px_32px_rgba(255,90,126,0.2)] scale-[1.01]"
                      : "bg-white hover:bg-blush/20 border-border text-ink"
                  )}
                >
                  <span className="leading-snug">{optionText}</span>
                  {isSelected && (
                    <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center shrink-0 ml-2">
                      <Check size={12} strokeWidth={2} className="text-white" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Action Button */}
          <button
            type="button"
            disabled={currentSelectedOption === null}
            onClick={handleNextGuessQuestion}
            className={cn(
              "w-full h-12 rounded-full font-medium text-xs transition-all shadow-xs active:scale-[0.99]",
              currentSelectedOption !== null
                ? "bg-primary hover:bg-deep text-white cursor-pointer"
                : "bg-canvas text-inkSoft border border-border cursor-not-allowed opacity-60"
            )}
          >
            {isLastQ ? "See Quiz Score &rarr;" : "Next Question &rarr;"}
          </button>
        </Card>
      </div>
    );
  }

  // 4. RESULT MODE: Score shown, non-shaming, review & save
  if (mode === "result") {
    if (!partnerQuiz) return null;
    const score = myAttempt?.score ?? 0;
    const answers = myAttempt?.answers || selectedAnswers;

    let celebration = "You know each other so deeply! Celebrate how much you cherish one another.";
    if (score === 5) {
      celebration = "A perfect 5 out of 5! Two hearts truly walking as one.";
    } else if (score >= 3) {
      celebration = "A sweet bond! Filled with warmth, understanding, and joy.";
    } else {
      celebration = "Every question is a wonderful opportunity to learn each other deeper.";
    }

    return (
      <div className="space-y-6 pb-20">
        <button
          type="button"
          onClick={() => setMode("dashboard")}
          className="inline-flex items-center space-x-1.5 text-xs text-inkSoft hover:text-ink transition-colors"
        >
          <ArrowLeft size={16} strokeWidth={1.5} />
          <span>Back to Quiz Hub</span>
        </button>

        {/* Score Card: White 24px radius */}
        <Card className="rounded-[24px] bg-white border border-border p-6 shadow-[0_8px_32px_rgba(255,90,126,0.08)] space-y-5 text-center">
          <div className="w-14 h-14 rounded-full bg-blush/30 border border-primary/20 flex items-center justify-center mx-auto text-primary">
            <Heart size={24} strokeWidth={1.5} className="fill-current text-primary" />
          </div>

          <div className="space-y-1">
            <Pill className="text-[10px] py-0.5 px-2.5">Quiz Results</Pill>
            <h1 className="font-heading text-3xl text-ink font-normal pt-1">
              {score} / 5 Correct
            </h1>
            <p className="text-xs text-inkSoft max-w-xs mx-auto leading-relaxed pt-1">
              {celebration}
            </p>
          </div>

          {/* Breakdown Review of 5 Questions */}
          <div className="space-y-3 pt-2 text-left">
            <span className="text-[11px] font-semibold text-inkSoft uppercase tracking-wider block">
              Review Answers
            </span>

            {partnerQuiz.questions.map((q, idx) => {
              const myPick = answers[idx];
              const isMatch = myPick === q.correctIndex;

              return (
                <div
                  key={idx}
                  className={cn(
                    "p-3.5 rounded-[18px] border text-xs space-y-1.5 transition-all",
                    isMatch
                      ? "bg-[#DDF2E6]/50 border-[#BCE7CE]"
                      : "bg-canvas border-border"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-ink">
                      {idx + 1}. {q.question}
                    </span>
                    {isMatch ? (
                      <span className="text-[10px] text-[#2C6E49] font-semibold flex items-center space-x-0.5">
                        <Check size={12} strokeWidth={2} />
                        <span>Match</span>
                      </span>
                    ) : (
                      <span className="text-[10px] text-inkSoft">Different</span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                    <div className="p-2 rounded-[12px] bg-white border border-border">
                      <span className="text-inkSoft block text-[9px] uppercase tracking-wider">
                        Your Guess
                      </span>
                      <span className="text-ink font-medium">
                        {typeof myPick === "number" ? q.options[myPick] : "—"}
                      </span>
                    </div>

                    <div className="p-2 rounded-[12px] bg-blush/20 border border-blush/40">
                      <span className="text-deep block text-[9px] uppercase tracking-wider font-semibold">
                        {partnerName}&apos;s True Pick
                      </span>
                      <span className="text-ink font-medium">
                        {q.options[q.correctIndex]}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Save to Space & Action Buttons */}
          <div className="space-y-2 pt-3">
            <button
              type="button"
              onClick={handleSaveResultToSpace}
              disabled={savedToSpace}
              className={cn(
                "w-full h-12 rounded-full font-medium text-xs transition-all flex items-center justify-center space-x-2 shadow-xs active:scale-[0.99]",
                savedToSpace
                  ? "bg-[#DDF2E6] text-[#2C6E49] border border-[#BCE7CE]"
                  : "bg-primary hover:bg-deep text-white"
              )}
            >
              {savedToSpace ? (
                <>
                  <Check size={16} strokeWidth={1.5} />
                  <span>Saved to Our Space ✓</span>
                </>
              ) : (
                <>
                  <Sparkles size={16} strokeWidth={1.5} />
                  <span>Save to Our Space</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setMode("dashboard")}
              className="w-full h-11 rounded-full bg-white hover:bg-canvas text-ink border border-border font-medium text-xs transition-colors"
            >
              Return to Quiz Hub
            </button>
          </div>
        </Card>
      </div>
    );
  }

  return null;
}
