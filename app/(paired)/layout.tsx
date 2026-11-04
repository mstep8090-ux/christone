"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Settings, Flame, Bell, PhoneCall, X } from "lucide-react";
import { BottomNav } from "@/components/ui/bottom-nav";
import { Pill } from "@/components/ui/pill";
import { supabase } from "@/lib/supabase/client";
import {
  registerServiceWorker,
  requestNotificationPermission,
  showWebNotification,
} from "@/lib/notifications";

export default function PairedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [streakCount, setStreakCount] = React.useState<number>(1);
  const [coupleId, setCoupleId] = React.useState<string>("");
  const [currentUserId, setCurrentUserId] = React.useState<string>("");
  const [userInitial, setUserInitial] = React.useState<string>("Y");
  const [partnerInitial, setPartnerInitial] = React.useState<string>("P");
  const [partnerName, setPartnerName] = React.useState<string>("Partner");

  // Notification state
  const [showNotificationPrompt, setShowNotificationPrompt] = React.useState(false);
  const [incomingCall, setIncomingCall] = React.useState<{
    callerName: string;
    callerId: string;
  } | null>(null);

  // Initialize service worker and check notification permission
  React.useEffect(() => {
    registerServiceWorker();

    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        setShowNotificationPrompt(true);
      }
    }
  }, []);

  const handleEnableNotifications = async () => {
    const res = await requestNotificationPermission();
    if (res === "granted") {
      setShowNotificationPrompt(false);
      showWebNotification("Notifications Enabled", {
        body: "You will now receive prayer call and moment alerts from your partner.",
        url: "/space",
      });
    } else {
      setShowNotificationPrompt(false);
    }
  };

  React.useEffect(() => {
    async function loadHeaderData() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          setCurrentUserId(user.id);
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
                setPartnerName(pProfile.display_name);
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

  // Realtime Incoming Prayer Call Listener across all pages
  React.useEffect(() => {
    if (!coupleId || !currentUserId) return;

    const channel = supabase
      .channel(`prayer_voice_${coupleId}`, {
        config: { broadcast: { self: false } },
      })
      .on("broadcast", { event: "prayer_call_incoming" }, (payload) => {
        if (payload?.payload?.callerId && payload.payload.callerId !== currentUserId) {
          const caller = payload.payload.callerName || partnerName || "Partner";
          setIncomingCall({
            callerName: caller,
            callerId: payload.payload.callerId,
          });

          // Show native browser notification if allowed
          showWebNotification(`🙏 Prayer Call from ${caller}`, {
            body: "Tap to join in covenant prayer now.",
            url: "/pray?call=join",
          }).catch(() => {});
        }
      })
      .on("broadcast", { event: "prayer_call_end" }, () => {
        setIncomingCall(null);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [coupleId, currentUserId, partnerName]);

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

      {/* GLOBAL INCOMING PRAYER CALL NOTIFICATION BANNER */}
      {incomingCall && pathname !== "/pray" && (
        <div className="fixed top-4 left-0 right-0 z-50 px-4 animate-in slide-in-from-top-4 duration-300">
          <div className="mx-auto max-w-[480px] bg-white border-2 border-primary rounded-[20px] p-3.5 shadow-[0_8px_32px_rgba(255,90,126,0.22)] flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="w-10 h-10 rounded-full bg-[#FF5A7E] text-white flex items-center justify-center flex-shrink-0 animate-pulse">
                <PhoneCall size={18} strokeWidth={2} />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-ink truncate">
                  Prayer Call: {incomingCall.callerName}
                </p>
                <p className="text-[11px] text-primary font-medium truncate">
                  Waiting to pray together...
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Link
                href="/pray?call=join"
                onClick={() => setIncomingCall(null)}
                className="h-8 px-3 rounded-full bg-primary hover:bg-deep text-white text-xs font-semibold flex items-center justify-center transition-colors shadow-xs"
              >
                Join
              </Link>
              <button
                type="button"
                onClick={() => setIncomingCall(null)}
                aria-label="Dismiss"
                className="w-7 h-7 rounded-full bg-canvas text-inkSoft hover:text-ink flex items-center justify-center"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUBTLE WEB NOTIFICATION OPT-IN PROMPT */}
      {showNotificationPrompt && (
        <div className="fixed top-2 left-0 right-0 z-40 px-4">
          <div className="mx-auto max-w-[480px] bg-[#FFFBFC] border border-[#FFC2CE] rounded-full py-1.5 px-3.5 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-2 text-[11px] text-inkSoft truncate">
              <Bell size={13} className="text-primary flex-shrink-0" />
              <span className="truncate">Enable alerts for prayer calls & moments</span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                type="button"
                onClick={handleEnableNotifications}
                className="text-[11px] font-semibold text-primary hover:underline"
              >
                Enable
              </button>
              <button
                type="button"
                onClick={() => setShowNotificationPrompt(false)}
                aria-label="Dismiss"
                className="text-inkSoft hover:text-ink text-xs"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

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

      {/* Fixed BottomNav */}
      <BottomNav />
    </div>
  );
}
