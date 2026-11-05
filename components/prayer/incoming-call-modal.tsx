"use client";

import * as React from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { PhoneCall, PhoneOff, Sparkles } from "lucide-react";
import { ringtone } from "@/lib/ringtone";

interface IncomingCallModalProps {
  isOpen: boolean;
  callerName: string;
  callerAvatar?: string | null;
  onPickCall: () => void;
  onDeclineCall: () => void;
}

export function IncomingCallModal({
  isOpen,
  callerName,
  callerAvatar,
  onPickCall,
  onDeclineCall,
}: IncomingCallModalProps) {
  // Start incoming ringtone when modal opens, stop when it closes
  React.useEffect(() => {
    if (isOpen) {
      try {
        ringtone.startIncomingRing();
      } catch (e) {
        console.warn("Incoming ringtone note:", e);
      }
    } else {
      ringtone.stopAll();
    }
    return () => {
      ringtone.stopAll();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const initial = callerName ? callerName.charAt(0).toUpperCase() : "P";

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-[#1A1A1E]/85 backdrop-blur-md"
        />

        {/* Modal Card */}
        <motion.div
          initial={{ scale: 0.88, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.88, opacity: 0, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 280 }}
          className="relative z-10 w-full max-w-[380px] rounded-[28px] bg-white border-2 border-primary/30 p-7 shadow-[0_16px_48px_rgba(255,90,126,0.25)] flex flex-col items-center text-center space-y-6 overflow-hidden"
        >
          {/* Subtle heavenly blush glow */}
          <div className="pointer-events-none absolute -top-16 -right-16 w-36 h-36 rounded-full bg-[#FFC2CE]/40 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-16 -left-16 w-36 h-36 rounded-full bg-[#FF5A7E]/25 blur-3xl" />

          {/* Top Pill Tag */}
          <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-[#FFC2CE]/40 border border-primary/20 text-xs font-semibold text-primary">
            <Sparkles size={12} strokeWidth={2} />
            <span>Incoming Prayer Call</span>
          </div>

          {/* Caller Details */}
          <div className="space-y-1">
            <h2 className="font-heading text-3xl text-ink font-normal leading-snug">
              {callerName}
            </h2>
            <p className="text-xs text-primary font-medium tracking-wide">
              Inviting you to pray together now...
            </p>
          </div>

          {/* Pulsing Avatar Halo */}
          <div className="relative my-2 flex items-center justify-center">
            {/* Outer pulsating wave */}
            <motion.div
              animate={{
                scale: [1, 1.25, 1],
                opacity: [0.3, 0.7, 0.3],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="absolute w-28 h-28 rounded-full bg-[#FF5A7E]/30"
            />
            <motion.div
              animate={{
                scale: [1, 1.45, 1],
                opacity: [0.15, 0.45, 0.15],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 0.3,
              }}
              className="absolute w-36 h-36 rounded-full bg-[#FFC2CE]/40"
            />

            {/* Avatar */}
            <div className="relative z-10 w-20 h-20 rounded-full border-4 border-white bg-primary text-white flex items-center justify-center text-2xl font-heading font-medium shadow-xl overflow-hidden">
              {callerAvatar ? (
                <Image
                  src={callerAvatar}
                  alt={callerName}
                  width={80}
                  height={80}
                  className="w-full h-full object-cover"
                />
              ) : (
                initial
              )}
            </div>
          </div>

          {/* Scripture prompt */}
          <p className="text-[11px] text-inkSoft italic max-w-xs leading-relaxed">
            &ldquo;Where two agree in prayer, heaven opens.&rdquo;
          </p>

          {/* ACTION BUTTONS: PICK CALL & DECLINE */}
          <div className="w-full grid grid-cols-2 gap-3 pt-2">
            {/* 1. DECLINE BUTTON */}
            <button
              type="button"
              onClick={onDeclineCall}
              className="h-13 rounded-full bg-canvas hover:bg-border/60 text-ink border border-border font-medium text-xs flex items-center justify-center space-x-1.5 transition-colors active:scale-95"
            >
              <PhoneOff size={16} strokeWidth={1.8} className="text-inkSoft" />
              <span>Decline</span>
            </button>

            {/* 2. PICK CALL BUTTON */}
            <button
              type="button"
              onClick={onPickCall}
              className="h-13 rounded-full bg-[#2C6E49] hover:bg-[#23583A] text-white font-semibold text-xs flex items-center justify-center space-x-1.5 shadow-[0_8px_24px_rgba(44,110,73,0.35)] transition-all active:scale-95 animate-pulse"
            >
              <PhoneCall size={16} strokeWidth={2} />
              <span>Pick Call</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
