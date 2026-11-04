"use client";

import * as React from "react";
import Link from "next/link";
import { Heart, MessageCircle, Gamepad2, Flame, Sparkles, Smile, Compass } from "lucide-react";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { MomentCard, type MomentItem } from "@/components/moment-card";
import { ComposerSheet } from "@/components/composer-sheet";
import { CheckinSheet } from "@/components/checkin-sheet";
import { supabase } from "@/lib/supabase/client";
import { getDailyPrompt, type DailyPromptData } from "@/lib/daily-prompt";
import { getCoupleBadges, type BadgeItem } from "@/lib/retention";
import { NotificationBanners } from "@/components/notification-banners";
import { WeeklyCheckinCard } from "@/components/weekly-checkin-card";
import { cn } from "@/lib/utils";

function PrayIcon({ className, size = 22, strokeWidth = 1.5 }: { className?: string; size?: number; strokeWidth?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M12 3.5V19.5" />
      <path d="M12 3.5C11.25 4.5 9.75 6.5 9.5 9.25C9.25 12 9.5 16 9.5 19.5" />
      <path d="M12 3.5C12.75 4.5 14.25 6.5 14.5 9.25C14.75 12 14.5 16 14.5 19.5" />
      <path d="M7 11.5C6.75 13.5 7.25 16.5 7.5 19.5" />
      <path d="M17 11.5C17.25 13.5 16.75 16.5 16.5 19.5" />
    </svg>
  );
}

function renderBadgeIcon(iconName: string) {
  switch (iconName) {
    case "message-circle":
      return <MessageCircle size={18} strokeWidth={1.5} />;
    case "flame":
      return <Flame size={18} strokeWidth={1.5} className="fill-current text-primary" />;
    case "sparkles":
      return <Sparkles size={18} strokeWidth={1.5} />;
    case "smile":
      return <Smile size={18} strokeWidth={1.5} />;
    case "heart":
      return <Heart size={18} strokeWidth={1.5} className="fill-current text-primary" />;
    case "compass":
      return <Compass size={18} strokeWidth={1.5} />;
    default:
      return <Sparkles size={18} strokeWidth={1.5} />;
  }
}

export default function SpacePage() {
  const [vision, setVision] = React.useState("");
  const [coupleId, setCoupleId] = React.useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = React.useState<string | null>(null);
  const [currentUserName, setCurrentUserName] = React.useState<string>("You");
  const [partnerNames, setPartnerNames] = React.useState<Record<string, string>>({});
  const [moments, setMoments] = React.useState<MomentItem[]>([]);
  const [savingVision, setSavingVision] = React.useState(false);
  const [dailyPrompt, setDailyPrompt] = React.useState<DailyPromptData | null>(null);
  const [badges, setBadges] = React.useState<BadgeItem[]>([]);
  const [partnerId, setPartnerId] = React.useState<string>("");
  const [partnerName, setPartnerName] = React.useState<string>("Partner");

  // Checkin Sheet state
  const [isCheckinOpen, setIsCheckinOpen] = React.useState(false);

  // Initial load
  React.useEffect(() => {
    async function loadSpaceData() {
      if (typeof window !== "undefined") {
        const cachedVision = localStorage.getItem("couple_vision");
        if (cachedVision) setVision(cachedVision);
      }

      try {
        const { data: authData } = await supabase.auth.getUser();
        const user = authData?.user;
        if (!user) return;
        setCurrentUserId(user.id);

        const { data: myProfile } = await supabase
          .from("profiles")
          .select("display_name")
          .eq("id", user.id)
          .maybeSingle();

        if (myProfile?.display_name) {
          setCurrentUserName(myProfile.display_name);
        }

        const { data: couple } = await supabase
          .from("couples")
          .select("id, vision, partner_a, partner_b")
          .or(`partner_a.eq.${user.id},partner_b.eq.${user.id}`)
          .maybeSingle();

        if (couple) {
          setCoupleId(couple.id);
          if (couple.vision) {
            setVision(couple.vision);
            if (typeof window !== "undefined") {
              localStorage.setItem("couple_vision", couple.vision);
            }
          }

          const pId =
            couple.partner_a === user.id
              ? couple.partner_b
              : couple.partner_a;
          if (pId) {
            setPartnerId(pId);
          }

          const userIds = [couple.partner_a, couple.partner_b].filter(Boolean) as string[];
          const { data: profilesList } = await supabase
            .from("profiles")
            .select("id, display_name")
            .in("id", userIds);

          const nameMap: Record<string, string> = {};
          profilesList?.forEach((p) => {
            nameMap[p.id] = p.display_name || "Partner";
          });
          setPartnerNames(nameMap);
          if (pId && nameMap[pId]) {
            setPartnerName(nameMap[pId]);
          }

          const { data: momentsList } = await supabase
            .from("moments")
            .select("*")
            .eq("couple_id", couple.id)
            .order("created_at", { ascending: false });

          if (momentsList) {
            const formatted: MomentItem[] = momentsList.map((m) => ({
              ...m,
              author_name: nameMap[m.author_id] || (m.author_id === user.id ? myProfile?.display_name || "You" : "Partner"),
            }));
            setMoments(formatted);
          }

          // Fetch daily question
          const daily = await getDailyPrompt(couple.id);
          if (daily) {
            setDailyPrompt(daily);
          }

          // Fetch badges
          const coupleBadges = await getCoupleBadges(couple.id);
          setBadges(coupleBadges);
        }
      } catch (err) {
        console.error("Failed to load space data:", err);
      }
    }

    loadSpaceData();
  }, []);

  // Supabase Realtime subscription
  React.useEffect(() => {
    if (!coupleId) return;

    const channel = supabase
      .channel(`realtime-moments:${coupleId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "moments",
          filter: `couple_id=eq.${coupleId}`,
        },
        async (payload) => {
          const newRow = payload.new as any;

          let authorName = partnerNames[newRow.author_id] || "Partner";
          if (!partnerNames[newRow.author_id]) {
            const { data: authorProf } = await supabase
              .from("profiles")
              .select("display_name")
              .eq("id", newRow.author_id)
              .maybeSingle();

            if (authorProf?.display_name) {
              authorName = authorProf.display_name;
              setPartnerNames((prev) => ({ ...prev, [newRow.author_id]: authorName }));
            }
          }

          setMoments((prev) => {
            if (prev.some((m) => m.id === newRow.id)) return prev;
            return [
              {
                ...newRow,
                author_name: authorName,
                isNew: true,
              },
              ...prev,
            ];
          });

          // Refresh badges on new moment
          const updatedBadges = await getCoupleBadges(coupleId);
          setBadges(updatedBadges);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "couple_badges",
          filter: `couple_id=eq.${coupleId}`,
        },
        async () => {
          const updatedBadges = await getCoupleBadges(coupleId);
          setBadges(updatedBadges);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [coupleId, partnerNames]);

  const handleVisionBlur = async () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("couple_vision", vision);
    }
    if (!coupleId) return;

    setSavingVision(true);
    try {
      await supabase
        .from("couples")
        .update({ vision: vision.trim() })
        .eq("id", coupleId);
    } catch (err) {
      console.error("Failed to save vision:", err);
    } finally {
      setSavingVision(false);
    }
  };

  const handleNewMoment = (newMoment: any) => {
    setMoments((prev) => {
      if (prev.some((m) => m.id === newMoment.id)) return prev;
      return [
        {
          ...newMoment,
          author_name: currentUserName,
          isNew: true,
        },
        ...prev,
      ];
    });
  };

  return (
    <div className="space-y-8 pb-28">
      {/* 1. TOP: VISION CARD PINNED */}
      <Card className="rounded-[24px] bg-white border border-border p-5 shadow-[0_8px_32px_rgba(255,90,126,0.08)]">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[14px] uppercase tracking-wider font-semibold text-primary">
            Our Kingdom Why
          </span>
          {savingVision && (
            <span className="text-[10px] text-inkSoft animate-pulse">Saving...</span>
          )}
        </div>
        <textarea
          value={vision}
          onChange={(e) => setVision(e.target.value)}
          onBlur={handleVisionBlur}
          placeholder="Why did God bring you together?"
          rows={3}
          className="w-full resize-none bg-transparent font-heading text-lg text-ink placeholder:font-body placeholder:text-sm placeholder:text-inkSoft/60 focus:outline-none leading-relaxed"
        />
      </Card>

      {/* In-App Notification Banners (soft blush bg #FFC2CE/30, 16px radius, icon left, close X, 48h nudge, unread partner alerts, daily talk) */}
      {coupleId && currentUserId && (
        <NotificationBanners
          coupleId={coupleId}
          currentUserId={currentUserId}
          currentUserName={currentUserName}
          partnerId={partnerId}
          partnerName={partnerName}
          dailyPrompt={dailyPrompt}
        />
      )}

      {/* Weekly Check-in (Shows only on Sunday or ?mockSunday=true / ?mockDay=0, headline: "Weekly Check-in - 5 mins") */}
      {coupleId && currentUserId && (
        <WeeklyCheckinCard
          coupleId={coupleId}
          currentUserId={currentUserId}
          currentUserName={currentUserName}
          onReviewSaved={handleNewMoment}
        />
      )}

      {/* 2. QUICK ACTIONS ROW (4 circular buttons 64px white) */}
      <section>
        <div className="grid grid-cols-4 gap-3">
          {/* Check-in opens CheckinSheet */}
          <button
            type="button"
            onClick={() => setIsCheckinOpen(true)}
            className="flex flex-col items-center group select-none"
          >
            <div className="w-16 h-16 rounded-full bg-white border border-border shadow-[0_8px_32px_rgba(255,90,126,0.08)] flex items-center justify-center text-ink group-hover:border-primary group-hover:text-primary transition-all active:scale-95">
              <Heart size={22} strokeWidth={1.5} />
            </div>
            <span className="text-[12px] font-medium text-inkSoft mt-1.5 group-hover:text-ink transition-colors">
              Check-in
            </span>
          </button>

          {/* Pray Quick Action */}
          <Link href="/pray" className="flex flex-col items-center group select-none">
            <div className="w-16 h-16 rounded-full bg-white border border-border shadow-[0_8px_32px_rgba(255,90,126,0.08)] flex items-center justify-center text-ink group-hover:border-primary group-hover:text-primary transition-all active:scale-95">
              <PrayIcon size={22} strokeWidth={1.5} />
            </div>
            <span className="text-[12px] font-medium text-inkSoft mt-1.5 group-hover:text-ink transition-colors">
              Pray
            </span>
          </Link>

          {/* Talk Quick Action */}
          <Link href="/talks" className="flex flex-col items-center group select-none">
            <div className="w-16 h-16 rounded-full bg-white border border-border shadow-[0_8px_32px_rgba(255,90,126,0.08)] flex items-center justify-center text-ink group-hover:border-primary group-hover:text-primary transition-all active:scale-95">
              <MessageCircle size={22} strokeWidth={1.5} />
            </div>
            <span className="text-[12px] font-medium text-inkSoft mt-1.5 group-hover:text-ink transition-colors">
              Talk
            </span>
          </Link>

          {/* Play Quick Action */}
          <Link href="/games" className="flex flex-col items-center group select-none">
            <div className="w-16 h-16 rounded-full bg-white border border-border shadow-[0_8px_32px_rgba(255,90,126,0.08)] flex items-center justify-center text-ink group-hover:border-primary group-hover:text-primary transition-all active:scale-95">
              <Gamepad2 size={22} strokeWidth={1.5} />
            </div>
            <span className="text-[12px] font-medium text-inkSoft mt-1.5 group-hover:text-ink transition-colors">
              Play
            </span>
          </Link>
        </div>
      </section>

      {/* 2.5 MILESTONE BADGES (Horizontal scroll row, no XP numbers, no leaderboard) */}
      <section className="space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-primary uppercase tracking-wider">
            Milestone Badges
          </span>
          <span className="text-[11px] text-inkSoft font-medium">
            {badges.filter((b) => b.awarded).length} of {badges.length} unlocked
          </span>
        </div>

        <div className="flex space-x-3 overflow-x-auto no-scrollbar py-1 -mx-6 px-6">
          {badges.map((b) => (
            <div
              key={b.id}
              className={cn(
                "flex-shrink-0 w-36 p-3.5 rounded-[20px] border flex flex-col items-center text-center space-y-2 select-none transition-all",
                b.awarded
                  ? "bg-white border-primary/30 shadow-[0_8px_32px_rgba(255,90,126,0.08)]"
                  : "bg-canvas/60 border-border opacity-50"
              )}
            >
              <div
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center transition-colors",
                  b.awarded
                    ? "bg-[#FFC2CE]/40 text-primary border border-primary/20 shadow-xs"
                    : "bg-border/40 text-inkSoft"
                )}
              >
                {renderBadgeIcon(b.icon)}
              </div>
              <div className="space-y-0.5">
                <span className="font-heading text-sm text-ink block leading-tight">
                  {b.title}
                </span>
                <span className="text-[10px] text-inkSoft leading-tight line-clamp-2 block font-body">
                  {b.description}
                </span>
              </div>
              {b.awarded && (
                <span className="text-[9px] font-semibold text-[#2C6E49] bg-[#DDF2E6] px-2 py-0.5 rounded-full">
                  Unlocked ✓
                </span>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* 3. FEED CONTAINER (id="feed-list", gap 16px) */}
      <section id="feed-list" className="flex flex-col gap-4">
        {moments.length === 0 ? (
          <div className="bg-white rounded-[24px] border border-border shadow-[0_8px_32px_rgba(255,90,126,0.08)]">
            <EmptyState
              headline="This is your timeline"
              subtext="No one else sees it."
            />
          </div>
        ) : (
          moments.map((moment) => (
            <MomentCard key={moment.id} moment={moment} />
          ))
        )}
      </section>

      {/* 4. COMPOSER BOTTOM SHEET */}
      <ComposerSheet
        coupleId={coupleId}
        authorId={currentUserId}
        onMomentPosted={handleNewMoment}
      />

      {/* 5. CHECK-IN BOTTOM SHEET */}
      <CheckinSheet
        isOpen={isCheckinOpen}
        onClose={() => setIsCheckinOpen(false)}
        coupleId={coupleId}
        userId={currentUserId}
        onCheckinSuccess={handleNewMoment}
      />
    </div>
  );
}
