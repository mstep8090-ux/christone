"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  Sparkles,
  Check,
  CheckCircle2,
  X,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Pill } from "@/components/ui/pill";
import { Card } from "@/components/ui/card";
import { supabase } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface WeeklyCheckinCardProps {
  coupleId: string;
  currentUserId: string;
  currentUserName: string;
  onReviewSaved?: (newMoment: any) => void;
}

const WEEKLY_PROMPTS = [
  "What worked this week?",
  "What was hard?",
  "How did we honor God?",
  "One thing to improve?",
  "Prayer for next week?",
] as const;

export function WeeklyCheckinCard({
  coupleId,
  currentUserId,
  currentUserName,
  onReviewSaved,
}: WeeklyCheckinCardProps) {
  const [answers, setAnswers] = React.useState<Record<string, string>>({
    "What worked this week?": "",
    "What was hard?": "",
    "How did we honor God?": "",
    "One thing to improve?": "",
    "Prayer for next week?": "",
  });

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [alreadyReviewed, setAlreadyReviewed] = React.useState(false);
  const [isDismissed, setIsDismissed] = React.useState(false);
  const [isSaved, setIsSaved] = React.useState(false);
  const [isExpanded, setIsExpanded] = React.useState(true);

  // Sunday logic: day === 0 or mock date
  const [mockSunday, setMockSunday] = React.useState(false);

  // Calculate Sunday week_start (YYYY-MM-DD)
  const currentSundayStr = React.useMemo(() => {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day; // day 0 is Sunday
    const sunday = new Date(now.setDate(diff));
    return sunday.toISOString().split("T")[0];
  }, []);

  // Determine if today is Sunday (or mocked)
  const isSunday = React.useMemo(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get("mockDay") === "0" || urlParams.get("mockSunday") === "true") {
        return true;
      }
      if (localStorage.getItem("mock_sunday") === "true") {
        return true;
      }
    }
    return new Date().getDay() === 0 || mockSunday;
  }, [mockSunday]);

  // Check if review already exists for this Sunday
  React.useEffect(() => {
    async function checkReview() {
      if (!coupleId) return;
      try {
        const { data } = await supabase
          .from("weekly_reviews")
          .select("id")
          .eq("couple_id", coupleId)
          .eq("week_start", currentSundayStr)
          .maybeSingle();

        if (data) {
          setAlreadyReviewed(true);
        }
      } catch (err) {
        console.error("Failed to check weekly review:", err);
      }
    }

    checkReview();
  }, [coupleId, currentSundayStr]);

  // Handle textarea change
  const handleAnswerChange = (promptText: string, text: string) => {
    setAnswers((prev) => ({
      ...prev,
      [promptText]: text,
    }));
  };

  // Submit review
  const handleSaveReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!coupleId || !currentUserId || isSubmitting) return;

    setIsSubmitting(true);

    try {
      // 1. Save to weekly_reviews table
      await supabase.from("weekly_reviews").upsert(
        {
          couple_id: coupleId,
          week_start: currentSundayStr,
          user_id: currentUserId,
          answers: answers as any,
        },
        { onConflict: "couple_id,week_start" }
      );

      // 2. Save as moment type review
      const momentContentPayload = {
        review_title: "Weekly Check-in",
        week_start: currentSundayStr,
        reviewer_name: currentUserName,
        answers,
      };

      const { data: newMoment } = await supabase
        .from("moments")
        .insert({
          couple_id: coupleId,
          author_id: currentUserId,
          type: "review",
          content: JSON.stringify(momentContentPayload),
        })
        .select("*")
        .single();

      setIsSaved(true);
      setAlreadyReviewed(true);

      if (newMoment && onReviewSaved) {
        onReviewSaved(newMoment);
      }

      setTimeout(() => {
        setIsDismissed(true);
      }, 3000);
    } catch (err) {
      console.error("Failed to save weekly review:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // DO NOT show on other days (unless mocked)
  // Only show once per Sunday per couple
  if (!isSunday || alreadyReviewed || isDismissed) {
    return null;
  }

  return (
    <Card className="rounded-[24px] bg-white border border-border p-6 shadow-[0_8px_32px_rgba(255,90,126,0.08)] space-y-5">
      {/* Top Header: Headline EXACT "Weekly Check-in - 5 mins" */}
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-primary" />
            <span className="text-[10px] text-primary uppercase tracking-wider font-semibold">
              Sunday Sabbath Ritual
            </span>
          </div>
          <h3 className="font-heading text-2xl text-ink font-normal">
            Weekly Check-in - 5 mins
          </h3>
          <p className="text-xs text-inkSoft">
            Pause, reflect together, and align your hearts for the new week.
          </p>
        </div>

        <div className="flex items-center space-x-1">
          <button
            type="button"
            onClick={() => setIsExpanded((prev) => !prev)}
            className="p-1 rounded-full text-inkSoft hover:text-ink transition-colors"
            title={isExpanded ? "Collapse" : "Expand"}
          >
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          {/* Gentle Dismiss (Do NOT make mandatory) */}
          <button
            type="button"
            onClick={() => setIsDismissed(true)}
            className="p-1 rounded-full text-inkSoft hover:text-ink transition-colors"
            title="Dismiss for now"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isSaved ? (
          /* SUCCESS CELEBRATION */
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-5 rounded-[20px] bg-[#DDF2E6]/60 border border-[#BCE7CE] text-center space-y-2"
          >
            <CheckCircle2 size={24} strokeWidth={1.5} className="mx-auto text-[#2C6E49]" />
            <h4 className="font-heading text-xl text-[#2C6E49] font-normal">
              Review Saved to Our Space!
            </h4>
            <p className="text-xs text-inkSoft">
              May God bless your upcoming week with peace and fruitfulness.
            </p>
          </motion.div>
        ) : isExpanded ? (
          /* 5 PROMPTS FORM */
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleSaveReview}
            className="space-y-4 pt-1"
          >
            {WEEKLY_PROMPTS.map((promptText, idx) => (
              <div key={idx} className="space-y-1.5">
                <label className="text-xs font-semibold text-ink font-body block">
                  {idx + 1}. {promptText}
                </label>
                <textarea
                  value={answers[promptText]}
                  onChange={(e) => handleAnswerChange(promptText, e.target.value)}
                  placeholder="Reflect together..."
                  rows={2}
                  className="w-full p-3 rounded-[16px] border border-border bg-canvas text-xs text-ink placeholder:text-inkSoft/50 focus:outline-none focus:border-primary transition-colors resize-none font-body leading-relaxed"
                />
              </div>
            ))}

            {/* Button EXACT: "Save Review" */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-12 rounded-full bg-primary hover:bg-deep text-white font-medium text-sm transition-all flex items-center justify-center space-x-2 shadow-[0_8px_32px_rgba(255,90,126,0.18)] active:scale-[0.99]"
              >
                {isSubmitting ? (
                  <span>Saving Review...</span>
                ) : (
                  <>
                    <Check size={16} strokeWidth={2} />
                    <span>Save Review</span>
                  </>
                )}
              </button>
            </div>
          </motion.form>
        ) : null}
      </AnimatePresence>
    </Card>
  );
}
