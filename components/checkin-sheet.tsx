"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Heart, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type MoodType = "peaceful" | "heavy" | "joyful";

interface CheckinSheetProps {
  isOpen: boolean;
  onClose: () => void;
  coupleId: string | null;
  userId: string | null;
  onCheckinSuccess: (newMoment: any) => void;
}

export function CheckinSheet({
  isOpen,
  onClose,
  coupleId,
  userId,
  onCheckinSuccess,
}: CheckinSheetProps) {
  const [selectedMood, setSelectedMood] = React.useState<MoodType | null>(null);
  const [note, setNote] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  const reset = () => {
    setSelectedMood(null);
    setNote("");
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleShare = async () => {
    if (!selectedMood) return;
    setSubmitting(true);

    const activeCoupleId = coupleId || "demo-couple-id";
    const activeUserId = userId || "demo-user-id";

    try {
      // 1. Insert into checkins table
      const { error: checkinErr } = await supabase.from("checkins").insert({
        couple_id: activeCoupleId,
        user_id: activeUserId,
        mood: selectedMood,
        note: note.trim() || null,
      });

      if (checkinErr) {
        console.error("Checkin insert error:", checkinErr);
      }

      // 2. Also create moment type checkin
      const checkinContent = JSON.stringify({
        mood: selectedMood,
        note: note.trim() || null,
      });

      const { data: momentData, error: momentErr } = await supabase
        .from("moments")
        .insert({
          couple_id: activeCoupleId,
          author_id: activeUserId,
          type: "checkin",
          content: checkinContent,
        })
        .select()
        .maybeSingle();

      const newMoment = momentData || {
        id: crypto.randomUUID(),
        couple_id: activeCoupleId,
        author_id: activeUserId,
        type: "checkin",
        content: checkinContent,
        created_at: new Date().toISOString(),
      };

      onCheckinSuccess(newMoment);
      handleClose();
    } catch (err) {
      console.error("Checkin error:", err);
      // Optimistic fallback
      const fallbackMoment = {
        id: crypto.randomUUID(),
        couple_id: activeCoupleId,
        author_id: activeUserId,
        type: "checkin",
        content: JSON.stringify({ mood: selectedMood, note: note.trim() || null }),
        created_at: new Date().toISOString(),
      };
      onCheckinSuccess(fallbackMoment);
      handleClose();
    } finally {
      setSubmitting(false);
    }
  };

  const moods: { key: MoodType; label: string; color: string; bg: string; border: string }[] = [
    {
      key: "peaceful",
      label: "Peaceful",
      color: "#2C6E49",
      bg: "#DDF2E6",
      border: "#BCE7CE",
    },
    {
      key: "heavy",
      label: "Heavy",
      color: "#6B5B5F",
      bg: "#F5E6E8",
      border: "#E8D3D6",
    },
    {
      key: "joyful",
      label: "Joyful",
      color: "#E84367",
      bg: "#FFC2CE",
      border: "#FFAEBE",
    },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="absolute inset-0 bg-ink/30 backdrop-blur-sm"
          />

          {/* Bottom Sheet */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 260 }}
            className="relative z-10 w-full max-w-[480px] rounded-t-[28px] bg-white border-t border-border shadow-[0_-8px_32px_rgba(255,90,126,0.12)] p-6 space-y-6"
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <h2 className="font-heading text-2xl text-ink font-normal">
                How is your heart today?
              </h2>
              <button
                type="button"
                onClick={handleClose}
                className="w-8 h-8 rounded-full flex items-center justify-center text-inkSoft hover:bg-canvas transition-colors"
              >
                <X size={18} strokeWidth={1.5} />
              </button>
            </div>

            {/* 3 Pills Large (Peaceful, Heavy, Joyful) */}
            <div className="grid grid-cols-3 gap-2.5">
              {moods.map((m) => {
                const isSelected = selectedMood === m.key;
                return (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => setSelectedMood(m.key)}
                    style={{
                      backgroundColor: m.bg,
                      color: m.color,
                      borderColor: isSelected ? "#FF5A7E" : m.border,
                    }}
                    className={cn(
                      "h-14 rounded-full font-medium text-sm flex items-center justify-center transition-all select-none active:scale-95 border",
                      isSelected ? "border-2 shadow-sm scale-102 font-bold ring-2 ring-[#FF5A7E]/30" : "opacity-90 hover:opacity-100"
                    )}
                  >
                    {m.label}
                  </button>
                );
              })}
            </div>

            {/* Optional Note Input */}
            <div className="space-y-1.5">
              <Input
                type="text"
                placeholder="Want to share more? (optional)"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="h-[56px] text-sm"
              />
            </div>

            {/* Button Share Check-in */}
            <Button
              type="button"
              variant="primary"
              disabled={submitting || !selectedMood}
              onClick={handleShare}
              className="w-full h-14 rounded-full text-base font-medium flex items-center justify-center space-x-2"
            >
              {submitting ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>Sharing...</span>
                </>
              ) : (
                <span>Share Check-in</span>
              )}
            </Button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
