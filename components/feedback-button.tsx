"use client";

import * as React from "react";
import { Heart, X, Send, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase/client";
import { logEvent } from "@/lib/analytics";

interface FeedbackButtonProps {
  coupleId?: string | null;
  userId?: string | null;
}

export function FeedbackButton({ coupleId, userId }: FeedbackButtonProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [message, setMessage] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || submitting) return;

    setSubmitting(true);
    try {
      let resolvedUserId = userId;
      let resolvedCoupleId = coupleId;

      if (!resolvedUserId) {
        const { data: authData } = await supabase.auth.getUser();
        resolvedUserId = authData?.user?.id || null;
      }

      await supabase.from("feedback").insert({
        couple_id: resolvedCoupleId || null,
        user_id: resolvedUserId || null,
        message: message.trim(),
      });

      await logEvent("feedback_submitted", resolvedCoupleId, {
        length: message.trim().length,
      });

      setSubmitted(true);
      setMessage("");
      setTimeout(() => {
        setSubmitted(false);
        setIsOpen(false);
      }, 2000);
    } catch (err) {
      console.error("Failed to submit feedback:", err);
      alert("Failed to submit feedback. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {/* Floating 48px Blush Circle Button with Heart Icon */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="fixed bottom-24 right-4 sm:right-8 z-30 w-12 h-12 rounded-full bg-[#FFC2CE] hover:bg-[#FFB2C2] text-[#1A1A1E] flex items-center justify-center shadow-[0_8px_32px_rgba(255,90,126,0.22)] border border-white/60 transition-transform active:scale-95 select-none"
        title="Share Feedback"
      >
        <Heart size={20} strokeWidth={1.5} className="fill-primary/20 text-[#FF5A7E]" />
      </button>

      {/* Feedback Modal / Sheet */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 pb-20 bg-ink/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 10 }}
              className="relative w-full max-w-[380px] bg-white rounded-[24px] border border-border p-6 shadow-[0_8px_32px_rgba(255,90,126,0.14)] space-y-4 max-h-[85vh] overflow-y-auto"
            >
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="absolute top-4 right-4 p-1.5 rounded-full text-inkSoft hover:text-ink transition-colors"
                title="Close"
              >
                <X size={16} />
              </button>

              <div className="space-y-1">
                <span className="text-[10px] text-primary uppercase tracking-wider font-semibold">
                  Couple Reflections
                </span>
                <h3 className="font-heading text-2xl text-ink font-normal">
                  Your Voice Matters
                </h3>
                <p className="text-xs text-inkSoft">
                  Help us refine your sacred sanctuary. Every reflection is received with gratitude.
                </p>
              </div>

              {submitted ? (
                <div className="p-4 rounded-[20px] bg-[#DDF2E6] border border-[#BCE7CE] text-center space-y-1 text-[#2C6E49]">
                  <Check size={20} className="mx-auto" />
                  <p className="text-xs font-semibold">Thank you for sharing your heart</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-3.5">
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="What can be softer?"
                    rows={4}
                    className="w-full p-3.5 rounded-[16px] border border-border bg-canvas text-xs text-ink placeholder:text-inkSoft/50 focus:outline-none focus:border-primary transition-colors resize-none font-body leading-relaxed"
                    autoFocus
                  />

                  <button
                    type="submit"
                    disabled={!message.trim() || submitting}
                    className="w-full h-11 rounded-full bg-primary hover:bg-deep disabled:opacity-50 text-white font-medium text-xs transition-all shadow-[0_8px_32px_rgba(255,90,126,0.18)] active:scale-[0.98] flex items-center justify-center space-x-1.5"
                  >
                    {submitting ? (
                      <span>Sending...</span>
                    ) : (
                      <>
                        <Send size={13} strokeWidth={2} />
                        <span>Send Feedback</span>
                      </>
                    )}
                  </button>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
