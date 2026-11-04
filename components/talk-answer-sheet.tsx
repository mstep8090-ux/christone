"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Lock, Heart, Check, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TalkPromptItem {
  id: string;
  deck_id: string;
  prompt_text: string;
  order_index: number;
}

export interface TalkAnswerItem {
  id: string;
  prompt_id: string;
  couple_id: string;
  user_id: string;
  answer: string;
  created_at: string;
}

interface TalkAnswerSheetProps {
  isOpen: boolean;
  onClose: () => void;
  prompt: TalkPromptItem | null;
  deckTitle: string;
  currentUserId: string;
  currentUserName: string;
  partnerId?: string;
  partnerName: string;
  myAnswer: TalkAnswerItem | null;
  partnerAnswer: TalkAnswerItem | null;
  onSubmitAnswer: (promptId: string, answerText: string) => Promise<boolean>;
  onSaveToSpace: (prompt: TalkPromptItem, myAnswerText: string, partnerAnswerText: string) => Promise<boolean>;
  isSavedToSpace?: boolean;
  isIntimacyDeck?: boolean;
}

export function TalkAnswerSheet({
  isOpen,
  onClose,
  prompt,
  deckTitle,
  currentUserId,
  currentUserName,
  partnerId,
  partnerName,
  myAnswer,
  partnerAnswer,
  onSubmitAnswer,
  onSaveToSpace,
  isSavedToSpace = false,
  isIntimacyDeck = false,
}: TalkAnswerSheetProps) {
  const [draft, setDraft] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [savedLocal, setSavedLocal] = React.useState(isSavedToSpace);

  // Sync draft and saved state when prompt changes
  React.useEffect(() => {
    setDraft("");
    setSavedLocal(isSavedToSpace);
  }, [prompt?.id, isSavedToSpace]);

  if (!isOpen || !prompt) return null;

  const hasMyAnswer = Boolean(myAnswer);
  const hasPartnerAnswer = Boolean(partnerAnswer);
  const isBothAnswered = hasMyAnswer && hasPartnerAnswer;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const ok = await onSubmitAnswer(prompt.id, draft.trim());
      if (ok) {
        setDraft("");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveToSpace = async () => {
    if (!myAnswer || !partnerAnswer || isSaving || savedLocal) return;
    setIsSaving(true);
    try {
      const ok = await onSaveToSpace(prompt, myAnswer.answer, partnerAnswer.answer);
      if (ok) {
        setSavedLocal(true);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const partnerInitial = partnerName ? partnerName.charAt(0).toUpperCase() : "P";
  const myInitial = currentUserName ? currentUserName.charAt(0).toUpperCase() : "Y";

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-ink/40 backdrop-blur-xs transition-opacity"
        />

        {/* Modal / Bottom Sheet Container */}
        <motion.div
          initial={{ y: "100%", opacity: 0.5 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "100%", opacity: 0 }}
          transition={{ type: "spring", damping: 28, stiffness: 300 }}
          className="relative z-10 w-full max-w-[480px] bg-white rounded-t-[24px] sm:rounded-[24px] p-6 shadow-2xl max-h-[92vh] overflow-y-auto"
        >
          {/* Top handle pill for mobile */}
          <div className="w-12 h-1 rounded-full bg-border mx-auto mb-4 sm:hidden" />

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute top-5 right-5 w-8 h-8 rounded-full bg-canvas border border-border flex items-center justify-center text-inkSoft hover:text-ink transition-colors"
          >
            <X size={16} strokeWidth={1.5} />
          </button>

          {/* Deck tag & Prompt Header */}
          <div className="pr-10 mb-4 space-y-1">
            <span className="text-[11px] font-semibold text-primary uppercase tracking-wider">
              {deckTitle} • Prompt {prompt.order_index}
            </span>
            <h3 className="font-heading text-xl sm:text-2xl text-ink leading-snug">
              {prompt.prompt_text}
            </h3>
          </div>

          {/* STATE 1: BOTH HAVE ANSWERED -> REVEAL MODE */}
          {isBothAnswered ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="space-y-5 pt-1"
            >
              {/* Partner Avatars Top */}
              <div className="flex items-center justify-center space-x-4 py-2">
                {/* User avatar */}
                <div className="flex flex-col items-center space-y-1">
                  <div className="w-10 h-10 rounded-full bg-primary text-white border-2 border-white shadow-sm flex items-center justify-center text-sm font-heading font-medium">
                    {myInitial}
                  </div>
                  <span className="text-[11px] font-medium text-ink">You</span>
                </div>

                {/* Connecting Heart Icon */}
                <div className="w-8 h-8 rounded-full bg-blush/30 border border-blush flex items-center justify-center text-primary">
                  <Heart size={14} strokeWidth={1.5} className="fill-primary/20" />
                </div>

                {/* Partner avatar */}
                <div className="flex flex-col items-center space-y-1">
                  <div className="w-10 h-10 rounded-full bg-blush text-ink border-2 border-white shadow-sm flex items-center justify-center text-sm font-heading font-medium">
                    {partnerInitial}
                  </div>
                  <span className="text-[11px] font-medium text-ink">{partnerName}</span>
                </div>
              </div>

              {/* Side-by-side answers */}
              <div className="grid grid-cols-2 gap-3">
                {/* Your answer card */}
                <div className="p-3.5 rounded-[16px] bg-canvas border border-border space-y-1.5 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-primary block">
                      Your Answer
                    </span>
                    <p className="text-xs text-ink font-body leading-relaxed whitespace-pre-wrap pt-1">
                      {myAnswer?.answer}
                    </p>
                  </div>
                  <span className="text-[10px] text-inkSoft/70 block pt-2">Revealed</span>
                </div>

                {/* Partner answer card */}
                <div className="p-3.5 rounded-[16px] bg-blush/20 border border-blush/50 space-y-1.5 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-deep block">
                      {partnerName}&apos;s Answer
                    </span>
                    <p className="text-xs text-ink font-body leading-relaxed whitespace-pre-wrap pt-1">
                      {partnerAnswer?.answer}
                    </p>
                  </div>
                  <span className="text-[10px] text-inkSoft/70 block pt-2">Revealed</span>
                </div>
              </div>

              {/* Action Button: Intimacy Private View vs Regular Space Save */}
              {isIntimacyDeck ? (
                <div className="space-y-2 pt-1 text-center">
                  <div className="p-3.5 rounded-[16px] bg-[#FFF5F7] border border-blush/60 text-xs text-inkSoft">
                    <p className="font-semibold text-ink">Private Intimacy View</p>
                    <p className="text-[11px] mt-0.5 text-inkSoft">
                      Kept strictly between the two of you. Not published to timeline feed.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={onClose}
                    className="w-full h-12 rounded-full bg-primary hover:bg-deep text-white font-medium text-sm transition-all shadow-xs active:scale-[0.99]"
                  >
                    Done (Keep Private)
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleSaveToSpace}
                  disabled={isSaving || savedLocal}
                  className={cn(
                    "w-full h-12 rounded-full font-medium text-sm transition-all flex items-center justify-center space-x-2 shadow-[0_8px_32px_rgba(255,90,126,0.12)] active:scale-[0.99]",
                    savedLocal
                      ? "bg-[#DDF2E6] text-[#2C6E49] border border-[#BCE7CE] cursor-default"
                      : "bg-primary hover:bg-deep text-white"
                  )}
                >
                  {savedLocal ? (
                    <>
                      <Check size={16} strokeWidth={1.5} />
                      <span>Saved to Our Space</span>
                    </>
                  ) : isSaving ? (
                    <span>Saving...</span>
                  ) : (
                    <>
                      <Sparkles size={16} strokeWidth={1.5} />
                      <span>Save to Our Space</span>
                    </>
                  )}
                </button>
              )}
            </motion.div>
          ) : hasMyAnswer && !hasPartnerAnswer ? (
            /* STATE 2: CURRENT USER ANSWERED, WAITING FOR PARTNER */
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              className="space-y-4 pt-1"
            >
              {/* Status Banner */}
              <div className="p-3.5 rounded-[16px] bg-canvas border border-border flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full bg-blush/40 text-primary flex items-center justify-center flex-shrink-0">
                  <Lock size={14} strokeWidth={1.5} />
                </div>
                <div className="text-xs text-inkSoft leading-relaxed">
                  <p className="font-semibold text-ink">Waiting for {partnerName}</p>
                  <p>Your answer is safely locked until {partnerName} submits theirs.</p>
                </div>
              </div>

              {/* Your Submitted Answer (Read-only, MVP no edit) */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold text-inkSoft uppercase tracking-wider">
                  Your Answer (Locked)
                </label>
                <div className="w-full p-3.5 rounded-[16px] border border-border bg-canvas text-xs text-ink font-body leading-relaxed whitespace-pre-wrap">
                  {myAnswer?.answer}
                </div>
              </div>

              {/* Partner placeholder stacked box */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold text-inkSoft uppercase tracking-wider">
                  {partnerName}&apos;s answer - private until both submit
                </label>
                <div className="p-3.5 rounded-[16px] border border-dashed border-border bg-canvas/60 flex items-center space-x-2 text-xs text-inkSoft">
                  <Lock size={14} strokeWidth={1.5} className="text-inkSoft/60 flex-shrink-0" />
                  <span>Waiting for {partnerName} to submit...</span>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-full h-12 rounded-full border border-border bg-white hover:bg-canvas text-ink font-medium text-sm transition-colors"
              >
                Close
              </button>
            </motion.div>
          ) : (
            /* STATE 3: USER HAS NOT SUBMITTED YET */
            <form onSubmit={handleSubmit} className="space-y-4 pt-1">
              {/* Stacked Textarea 1: Your answer */}
              <div className="space-y-1.5">
                <label
                  htmlFor="talk-user-answer"
                  className="block text-[11px] font-semibold text-inkSoft uppercase tracking-wider"
                >
                  Your answer - private until both submit
                </label>
                <textarea
                  id="talk-user-answer"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Share honestly..."
                  rows={4}
                  className="w-full p-3.5 rounded-[16px] border border-border focus:border-primary focus:outline-none text-sm text-ink font-body resize-none bg-canvas placeholder:text-inkSoft/60 transition-colors"
                  autoFocus
                />
              </div>

              {/* Stacked Textarea 2: Partner's answer locked placeholder */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold text-inkSoft uppercase tracking-wider">
                  {partnerName}&apos;s answer - private until both submit
                </label>
                <div className="p-3.5 rounded-[16px] border border-dashed border-border bg-canvas/70 flex items-center space-x-2.5 text-xs text-inkSoft">
                  <Lock size={14} strokeWidth={1.5} className="text-primary flex-shrink-0" />
                  <span>
                    {hasPartnerAnswer
                      ? `${partnerName} has submitted! Answer will reveal as soon as you submit.`
                      : `Private until both submit. ${partnerName} hasn't answered yet.`}
                  </span>
                </div>
              </div>

              {/* Rose Submit Button */}
              <button
                type="submit"
                disabled={!draft.trim() || isSubmitting}
                className="w-full h-12 rounded-full bg-primary hover:bg-deep text-white font-medium text-sm transition-all shadow-[0_8px_32px_rgba(255,90,126,0.15)] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                <span>{isSubmitting ? "Submitting..." : "Submit Answer"}</span>
              </button>

              {/* Skip button + Note for intimacy decks: always show Skip button + note "Stays between you two. Skip anytime." */}
              {isIntimacyDeck && (
                <div className="pt-2 text-center space-y-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="text-xs font-medium text-inkSoft hover:text-ink transition-colors py-1 inline-flex items-center space-x-1"
                  >
                    <span>Skip this prompt</span>
                  </button>
                  <p className="text-[11px] text-inkSoft flex items-center justify-center space-x-1">
                    <Lock size={11} strokeWidth={1.5} className="text-primary flex-shrink-0" />
                    <span>Stays between you two. Skip anytime.</span>
                  </p>
                </div>
              )}
            </form>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
