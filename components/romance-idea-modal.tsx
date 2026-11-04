"use client";

import * as React from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X, Heart, Check, RefreshCw } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

export interface RomanceIdea {
  id: string;
  text: string;
  illustration: string;
  category: string;
}

export const ROMANCE_IDEAS: RomanceIdea[] = [
  {
    id: "cook-worship",
    text: "Cook together with worship in background",
    illustration: "/illustrations/romance-cooking.svg",
    category: "Kitchen & Worship",
  },
  {
    id: "write-love-notes",
    text: "Write 3 things you love about each other",
    illustration: "/illustrations/romance-writing.svg",
    category: "Words of Affirmation",
  },
  {
    id: "walk-and-pray",
    text: "Take a walk and pray for your future",
    illustration: "/illustrations/romance-walking.svg",
    category: "Peace & Prayer",
  },
];

interface RomanceIdeaModalProps {
  isOpen: boolean;
  onClose: () => void;
  coupleId: string | null;
  authorId: string | null;
  authorName?: string;
  onMomentCreated?: (moment: any) => void;
}

export function RomanceIdeaModal({
  isOpen,
  onClose,
  coupleId,
  authorId,
  authorName = "You",
  onMomentCreated,
}: RomanceIdeaModalProps) {
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [hasDone, setHasDone] = React.useState(false);

  // Pick random idea on open
  React.useEffect(() => {
    if (isOpen) {
      const randomIdx = Math.floor(Math.random() * ROMANCE_IDEAS.length);
      setCurrentIndex(randomIdx);
      setHasDone(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentIdea = ROMANCE_IDEAS[currentIndex];

  const handleShuffle = () => {
    setCurrentIndex((prev) => (prev + 1) % ROMANCE_IDEAS.length);
    setHasDone(false);
  };

  const handleDoThis = async () => {
    if (!coupleId || !authorId || isSubmitting || hasDone) return;

    setIsSubmitting(true);
    try {
      const contentText = `Tonight's Date: "${currentIdea.text}" ♥`;

      const { data, error } = await supabase
        .from("moments")
        .insert({
          couple_id: coupleId,
          author_id: authorId,
          type: "note",
          content: contentText,
        })
        .select()
        .single();

      if (error) {
        console.error("Failed to create romance idea moment:", error);
        return;
      }

      setHasDone(true);
      if (onMomentCreated && data) {
        onMomentCreated(data);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-ink/40 backdrop-blur-xs transition-opacity"
        />

        {/* Modal: white 24px radius */}
        <motion.div
          initial={{ scale: 0.94, opacity: 0, y: 12 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.94, opacity: 0, y: 12 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className="relative z-10 w-full max-w-[380px] bg-white rounded-[24px] p-6 shadow-2xl border border-border space-y-4 text-center"
        >
          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-canvas border border-border flex items-center justify-center text-inkSoft hover:text-ink transition-colors"
          >
            <X size={16} strokeWidth={1.5} />
          </button>

          {/* Top Blush Icon & Category Header */}
          <div className="flex flex-col items-center space-y-2 pt-2">
            {/* Blush icon circle */}
            <div className="w-12 h-12 rounded-full bg-[#FFC2CE] flex items-center justify-center text-primary shadow-xs">
              <Sparkles size={22} strokeWidth={1.5} className="fill-primary/20" />
            </div>

            <span className="text-[11px] font-semibold text-primary uppercase tracking-wider">
              Idea for Tonight
            </span>
          </div>

          {/* Illustration: 200x200 minimal line art */}
          <div className="relative w-[180px] h-[180px] mx-auto rounded-[20px] overflow-hidden border border-border shadow-xs bg-[#FFF5F7]">
            <Image
              src={currentIdea.illustration}
              alt={currentIdea.text}
              fill
              className="object-contain p-2"
            />
          </div>

          {/* Idea Text: 16px */}
          <p className="text-[16px] text-ink font-body font-medium leading-relaxed px-2">
            &ldquo;{currentIdea.text}&rdquo;
          </p>

          {/* Actions */}
          <div className="pt-2 space-y-2">
            {/* Button EXACT: "Do this" */}
            <button
              type="button"
              onClick={handleDoThis}
              disabled={isSubmitting || hasDone}
              className="w-full h-12 rounded-full bg-primary hover:bg-deep text-white font-medium text-sm transition-all shadow-[0_8px_32px_rgba(255,90,126,0.15)] active:scale-[0.99] flex items-center justify-center space-x-2 disabled:opacity-85"
            >
              {hasDone ? (
                <>
                  <Check size={16} strokeWidth={1.5} />
                  <span>Added to Our Space!</span>
                </>
              ) : isSubmitting ? (
                <span>Adding...</span>
              ) : (
                <>
                  <Heart size={15} strokeWidth={1.5} className="fill-white" />
                  <span>Do this</span>
                </>
              )}
            </button>

            {/* Shuffle button */}
            <button
              type="button"
              onClick={handleShuffle}
              className="inline-flex items-center space-x-1.5 text-xs text-inkSoft hover:text-ink transition-colors py-1"
            >
              <RefreshCw size={12} strokeWidth={1.5} />
              <span>Another idea</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
