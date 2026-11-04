"use client";

import * as React from "react";
import Link from "next/link";
import { Settings, Flame } from "lucide-react";
import { BottomNav } from "@/components/ui/bottom-nav";
import { Pill } from "@/components/ui/pill";
import { FeedbackButton } from "@/components/feedback-button";
import { supabase } from "@/lib/supabase/client";

export default function PairedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [streakCount, setStreakCount] = React.useState<number>(1);
  const [coupleId, setCoupleId] = React.useState<string>("");
  const [userInitial, setUserInitial] = React.useState<string>("Y");
  const [partnerInitial, setPartnerInitial] = React.useState<string>("P");

  React.useEffect(() => {
    async function loadHeaderData() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          const { data: myProfile } = await supabase
            .from("profiles")
            .select("display_name")
            .eq("id", user.id)
            .maybeSingle();

          if (myProfile?.display_name) {
            setUserInitial(myProfile.display_name.charAt(0).toUpperCase());
          }

          const { data: coupleData } = await supabase
            .from("couples")
            .select("*")
            .or(`partner_a.eq.${user.id},partner_b.eq.${user.id}`)
            .eq("status", "paired")
            .maybeSingle();

          if (coupleData) {
            setCoupleId(coupleData.id);

            const pId =
              coupleData.partner_a === user.id
                ? coupleData.partner_b
                : coupleData.partner_a;

            if (pId) {
              const { data: pProfile } = await supabase
                .from("profiles")
                .select("display_name")
                .eq("id", pId)
                .maybeSingle();

              if (pProfile?.display_name) {
                setPartnerInitial(pProfile.display_name.charAt(0).toUpperCase());
              }
            }

            // Fetch streak
            const { data: streakRow } = await supabase
              .from("streaks")
              .select("count")
              .eq("couple_id", coupleData.id)
              .maybeSingle();

            if (streakRow?.count) {
              setStreakCount(streakRow.count);
            }
          }
        }
      } catch (err) {
        console.error("Failed to load header data:", err);
      }
    }

    loadHeaderData();
  }, []);

  // Realtime streak sync
  React.useEffect(() => {
    if (!coupleId) return;

    const channel = supabase
      .channel(`realtime-header-streak-${coupleId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "streaks",
          filter: `couple_id=eq.${coupleId}`,
        },
        (payload) => {
          const row = (payload.new || payload.old) as any;
          if (row?.count) {
            setStreakCount(row.count);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [coupleId]);

  return (
    <div className="relative min-h-screen bg-canvas text-ink">
      {/* Background subtle blob */}
      <div
        className="pointer-events-none absolute -top-24 -right-24 z-0 h-[450px] w-[450px] opacity-40 blur-[80px]"
        style={{
          backgroundImage: "url('/blob.svg')",
          backgroundSize: "contain",
          backgroundRepeat: "no-repeat",
        }}
      />

      <div className="relative z-10 mx-auto max-w-[480px] px-6 pt-6 pb-36">
        {/* Top Header */}
        <header className="flex items-center justify-between h-12 mb-6">
          {/* Left: Overlapping Avatars 32px */}
          <div className="flex items-center -space-x-2">
            <div className="w-8 h-8 rounded-full border-2 border-white bg-blush/60 flex items-center justify-center text-xs font-heading font-medium text-ink shadow-sm">
              {userInitial}
            </div>
            <div className="w-8 h-8 rounded-full border-2 border-white bg-primary text-white flex items-center justify-center text-xs font-heading font-medium shadow-sm">
              {partnerInitial}
            </div>
          </div>

          {/* Center: Flame icon lucide + count e.g., '7 days' pill blush bg */}
          <div className="py-1 px-3.5 rounded-full text-xs flex items-center space-x-1.5 border border-primary/20 bg-[#FFC2CE]/40 shadow-sm text-primary">
            <Flame size={14} strokeWidth={2} className="fill-current text-primary" />
            <span className="font-semibold">
              {streakCount} {streakCount === 1 ? "day" : "days"}
            </span>
          </div>

          {/* Right: Settings Icon */}
          <Link
            href="/settings"
            className="w-8 h-8 rounded-full border border-border bg-white flex items-center justify-center text-inkSoft hover:text-ink transition-colors shadow-sm"
          >
            <Settings size={16} strokeWidth={1.5} />
          </Link>
        </header>

        {/* Paired Pages Content */}
        {children}
      </div>

      {/* Floating Feedback Button */}
      <FeedbackButton coupleId={coupleId} />

      {/* Fixed BottomNav */}
      <BottomNav />
    </div>
  );
}
