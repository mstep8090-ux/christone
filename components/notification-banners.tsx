"use client";

import * as React from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart,
  MessageCircle,
  Sparkles,
  Flame,
  X,
  Send,
  Check,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import type { DailyPromptData } from "@/lib/daily-prompt";
import { cn } from "@/lib/utils";

interface NotificationBannersProps {
  coupleId: string;
  currentUserId: string;
  currentUserName: string;
  partnerId: string;
  partnerName: string;
  dailyPrompt: DailyPromptData | null;
}

interface InAppNotification {
  id: string;
  couple_id: string;
  user_id: string;
  type: "daily_talk" | "prayer" | "streak_at_risk" | "nudge";
  title: string;
  read: boolean;
  created_at: string;
}

export function NotificationBanners({
  coupleId,
  currentUserId,
  currentUserName,
  partnerId,
  partnerName,
  dailyPrompt,
}: NotificationBannersProps) {
  const [unreadNotifications, setUnreadNotifications] = React.useState<InAppNotification[]>([]);
  const [isDailyAnswered, setIsDailyAnswered] = React.useState<boolean>(false);
  const [isInactive48h, setIsInactive48h] = React.useState<boolean>(false);
  const [nudgeSent, setNudgeSent] = React.useState<boolean>(false);
  const [dismissedDailyBanner, setDismissedDailyBanner] = React.useState<boolean>(false);
  const [dismissedNudgeBanner, setDismissedNudgeBanner] = React.useState<boolean>(false);

  // 1. Fetch unread notifications for current user
  const loadNotifications = React.useCallback(async () => {
    if (!coupleId || !currentUserId) return;
    try {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("couple_id", coupleId)
        .eq("user_id", currentUserId)
        .eq("read", false)
        .order("created_at", { ascending: false });

      if (data) {
        setUnreadNotifications(data as InAppNotification[]);
      }
    } catch (err) {
      console.error("Failed to load notifications:", err);
    }
  }, [coupleId, currentUserId]);

  // 2. Check 48h inactivity & check if daily question answered
  React.useEffect(() => {
    async function checkInactivityAndDaily() {
      if (!coupleId || !currentUserId) return;

      try {
        // Check 48h inactivity
        const { data: streakRow } = await supabase
          .from("streaks")
          .select("last_activity")
          .eq("couple_id", coupleId)
          .maybeSingle();

        if (streakRow?.last_activity) {
          const today = new Date();
          const lastDate = new Date(streakRow.last_activity);
          const diffMs = today.getTime() - lastDate.getTime();
          const diffHours = diffMs / (1000 * 60 * 60);

          if (diffHours >= 48) {
            setIsInactive48h(true);
          }
        }

        // Check if daily question answered today
        if (dailyPrompt?.prompt_id) {
          const { data: myAnswer } = await supabase
            .from("talk_answers")
            .select("id")
            .eq("couple_id", coupleId)
            .eq("prompt_id", dailyPrompt.prompt_id)
            .eq("user_id", currentUserId)
            .maybeSingle();

          if (myAnswer) {
            setIsDailyAnswered(true);
          }
        }
      } catch (err) {
        console.error("Failed to check banner status:", err);
      }
    }

    checkInactivityAndDaily();
    loadNotifications();
  }, [coupleId, currentUserId, dailyPrompt?.prompt_id, loadNotifications]);

  // Realtime subscription for incoming notifications
  React.useEffect(() => {
    if (!coupleId || !currentUserId) return;

    const channel = supabase
      .channel(`realtime-notifications-${coupleId}-${currentUserId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${currentUserId}`,
        },
        () => {
          loadNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [coupleId, currentUserId, loadNotifications]);

  // Mark in-app notification as read
  const handleDismissNotification = async (notificationId: string) => {
    setUnreadNotifications((prev) => prev.filter((n) => n.id !== notificationId));
    try {
      await supabase
        .from("notifications")
        .update({ read: true })
        .eq("id", notificationId);
    } catch (err) {
      console.error("Failed to mark notification read:", err);
    }
  };

  // Send nudge to partner
  const handleSendNudge = async () => {
    if (!coupleId || !partnerId || nudgeSent) return;

    try {
      const nudgeTitle = `${currentUserName} is thinking of you in your space`;

      await supabase.from("notifications").insert({
        couple_id: coupleId,
        user_id: partnerId,
        type: "nudge",
        title: nudgeTitle,
        read: false,
      });

      setNudgeSent(true);
      setTimeout(() => {
        setDismissedNudgeBanner(true);
      }, 2500);
    } catch (err) {
      console.error("Failed to send nudge:", err);
    }
  };

  return (
    <div className="space-y-2.5">
      {/* 1. UNREAD NOTIFICATIONS FOR CURRENT USER (e.g. Nudge, Prayer, Talk) */}
      <AnimatePresence>
        {unreadNotifications.map((notif) => (
          <motion.div
            key={notif.id}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96 }}
            className="w-full rounded-[16px] bg-[#FFC2CE]/30 border border-primary/20 p-3.5 shadow-[0_8px_32px_rgba(255,90,126,0.06)] flex items-center justify-between gap-3"
          >
            {/* Left icon + Title */}
            <div className="flex items-center space-x-2.5 min-w-0 flex-1">
              <div className="w-8 h-8 rounded-full bg-white border border-primary/20 flex items-center justify-center shrink-0 text-primary shadow-xs">
                {notif.type === "nudge" ? (
                  <Heart size={16} strokeWidth={1.5} className="fill-current text-primary" />
                ) : notif.type === "prayer" ? (
                  <Sparkles size={16} strokeWidth={1.5} />
                ) : notif.type === "streak_at_risk" ? (
                  <Flame size={16} strokeWidth={1.5} className="fill-current text-primary" />
                ) : (
                  <MessageCircle size={16} strokeWidth={1.5} />
                )}
              </div>

              <div className="min-w-0">
                <span className="text-[10px] text-primary uppercase tracking-wider font-semibold block leading-tight">
                  Notification
                </span>
                <p className="text-xs text-ink font-body font-medium leading-snug">
                  {notif.title}
                </p>
              </div>
            </div>

            {/* Right: Close X button */}
            <button
              type="button"
              onClick={() => handleDismissNotification(notif.id)}
              className="p-1 rounded-full text-inkSoft hover:text-ink hover:bg-white/50 transition-colors shrink-0"
              title="Dismiss"
            >
              <X size={15} strokeWidth={1.5} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* 2. 48h INACTIVITY NUDGE BANNER: "Missing your partner? Send a nudge" */}
      {isInactive48h && !dismissedNudgeBanner && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96 }}
          className="w-full rounded-[16px] bg-[#FFC2CE]/30 border border-primary/20 p-3.5 shadow-[0_8px_32px_rgba(255,90,126,0.06)] flex items-center justify-between gap-3"
        >
          <div className="flex items-center space-x-2.5 min-w-0 flex-1">
            <div className="w-8 h-8 rounded-full bg-white border border-primary/20 flex items-center justify-center shrink-0 text-primary shadow-xs">
              <Heart size={16} strokeWidth={1.5} className="fill-current text-primary" />
            </div>

            <div className="min-w-0">
              <p className="text-xs text-ink font-body font-medium leading-snug">
                Missing your partner? Send a nudge
              </p>
              <span className="text-[10px] text-inkSoft block">
                Let {partnerName} know they are on your heart.
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-1.5 shrink-0">
            <button
              type="button"
              disabled={nudgeSent}
              onClick={handleSendNudge}
              className={cn(
                "h-8 px-3 rounded-full text-[11px] font-medium transition-all flex items-center space-x-1 shadow-xs active:scale-95",
                nudgeSent
                  ? "bg-[#DDF2E6] text-[#2C6E49] border border-[#BCE7CE]"
                  : "bg-primary hover:bg-deep text-white"
              )}
            >
              {nudgeSent ? (
                <>
                  <Check size={12} strokeWidth={2} />
                  <span>Nudge sent!</span>
                </>
              ) : (
                <>
                  <Send size={11} strokeWidth={1.5} />
                  <span>Send Nudge</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setDismissedNudgeBanner(true)}
              className="p-1 rounded-full text-inkSoft hover:text-ink hover:bg-white/50 transition-colors"
              title="Close"
            >
              <X size={15} strokeWidth={1.5} />
            </button>
          </div>
        </motion.div>
      )}

      {/* 3. DAILY TALK BANNER: If daily question not answered today */}
      {dailyPrompt && !isDailyAnswered && !dismissedDailyBanner && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96 }}
          className="w-full rounded-[16px] bg-[#FFC2CE]/30 border border-primary/20 p-3.5 shadow-[0_8px_32px_rgba(255,90,126,0.06)] flex items-center justify-between gap-3"
        >
          <div className="flex items-center space-x-2.5 min-w-0 flex-1">
            <div className="w-8 h-8 rounded-full bg-white border border-primary/20 flex items-center justify-center shrink-0 text-primary shadow-xs">
              <MessageCircle size={16} strokeWidth={1.5} />
            </div>

            <div className="min-w-0">
              <div className="flex items-center space-x-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                <span className="text-[10px] text-primary uppercase tracking-wider font-semibold">
                  Today&apos;s Talk
                </span>
              </div>
              <p className="text-xs text-ink font-body truncate leading-snug">
                {dailyPrompt.prompt.prompt_text}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-1.5 shrink-0">
            <Link
              href={`/talks/${dailyPrompt.prompt.deck_id}?promptId=${dailyPrompt.prompt_id}`}
              className="h-8 px-3.5 rounded-full bg-primary hover:bg-deep text-white text-[11px] font-medium transition-all flex items-center justify-center shadow-xs active:scale-95"
            >
              Answer
            </Link>

            <button
              type="button"
              onClick={() => setDismissedDailyBanner(true)}
              className="p-1 rounded-full text-inkSoft hover:text-ink hover:bg-white/50 transition-colors"
              title="Close"
            >
              <X size={15} strokeWidth={1.5} />
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
