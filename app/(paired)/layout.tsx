"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Settings, Flame, Bell, PhoneCall, X, Sparkles } from "lucide-react";
import { BottomNav } from "@/components/ui/bottom-nav";
import { Pill } from "@/components/ui/pill";
import { supabase } from "@/lib/supabase/client";
import {
  registerServiceWorker,
  requestNotificationPermission,
  showWebNotification,
  sendCoupleNotification,
} from "@/lib/notifications";
import { ringtone } from "@/lib/ringtone";
import { IncomingCallModal } from "@/components/prayer/incoming-call-modal";
import { PrayerCallModal } from "@/components/prayer/prayer-call-modal";

export default function PairedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [streakCount, setStreakCount] = React.useState<number>(1);
  const [coupleId, setCoupleId] = React.useState<string>("");
  const [currentUserId, setCurrentUserId] = React.useState<string>("");
  const [currentUserName, setCurrentUserName] = React.useState<string>("You");
  const [currentUserAvatar, setCurrentUserAvatar] = React.useState<string | null>(null);
  const [userInitial, setUserInitial] = React.useState<string>("Y");
  const [partnerId, setPartnerId] = React.useState<string>("");
  const [partnerName, setPartnerName] = React.useState<string>("Partner");
  const [partnerAvatar, setPartnerAvatar] = React.useState<string | null>(null);
  const [partnerInitial, setPartnerInitial] = React.useState<string>("P");
  const [isPro, setIsPro] = React.useState<boolean>(false);

  // Notification state
  const [showNotificationPrompt, setShowNotificationPrompt] = React.useState(false);

  // Incoming Call State (triggers popup modal on Home Dashboard & all pages)
  const [incomingCall, setIncomingCall] = React.useState<{
    callerName: string;
    callerId: string;
  } | null>(null);

  // Active In-Call Modal State (WebRTC Voice Call)
  const [activeCallModal, setActiveCallModal] = React.useState(false);
  const [activeCallIsCaller, setActiveCallIsCaller] = React.useState(false);

  // Initialize service worker and notification permission
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

  // Load user & couple profile
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
            .select("display_name, avatar_url")
            .eq("id", user.id)
            .maybeSingle();

          if (myProfile?.display_name) {
            setCurrentUserName(myProfile.display_name);
            setUserInitial(myProfile.display_name.charAt(0).toUpperCase());
          }
          if (myProfile?.avatar_url) {
            setCurrentUserAvatar(myProfile.avatar_url);
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
              setPartnerId(pId);
              const { data: pProfile } = await supabase
                .from("profiles")
                .select("display_name, avatar_url")
                .eq("id", pId)
                .maybeSingle();

              if (pProfile) {
                if (pProfile.display_name) {
                  setPartnerName(pProfile.display_name);
                  setPartnerInitial(pProfile.display_name.charAt(0).toUpperCase());
                }
                if (pProfile.avatar_url) {
                  setPartnerAvatar(pProfile.avatar_url);
                }
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

            // Fetch subscription status
            const { data: subRow } = await supabase
              .from("subscriptions")
              .select("status, expires_at")
              .eq("couple_id", coupleData.id)
              .maybeSingle();

            if (subRow?.status === "premium") {
              const active = !subRow.expires_at || new Date(subRow.expires_at) > new Date();
              setIsPro(active);
            }
          }
        }
      } catch (err) {
        console.error("Failed to load header data:", err);
      }
    }

    loadHeaderData();
  }, []);

  // Realtime streak & subscription sync
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
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "subscriptions",
          filter: `couple_id=eq.${coupleId}`,
        },
        (payload) => {
          const row = (payload.new || payload.old) as any;
          if (row?.status === "premium") {
            const active = !row.expires_at || new Date(row.expires_at) > new Date();
            setIsPro(active);
          } else if (row?.status === "free") {
            setIsPro(false);
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "profiles",
        },
        (payload) => {
          const row = (payload.new || payload.old) as any;
          if (row) {
            if (row.id === currentUserId) {
              if (row.avatar_url !== undefined) setCurrentUserAvatar(row.avatar_url);
              if (row.display_name) {
                setCurrentUserName(row.display_name);
                setUserInitial(row.display_name.charAt(0).toUpperCase());
              }
            } else if (row.id === partnerId) {
              if (row.avatar_url !== undefined) setPartnerAvatar(row.avatar_url);
              if (row.display_name) {
                setPartnerName(row.display_name);
                setPartnerInitial(row.display_name.charAt(0).toUpperCase());
              }
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [coupleId, currentUserId, partnerId]);

  // Global event listeners to start or pick prayer call from anywhere in app
  React.useEffect(() => {
    const handleStartCall = async () => {
      setIncomingCall(null);
      setActiveCallIsCaller(true);
      setActiveCallModal(true);

      if (coupleId && currentUserId) {
        try {
          // 1. Mark previous active calls as ended
          await supabase
            .from("prayer_calls")
            .update({ status: "ended", updated_at: new Date().toISOString() })
            .eq("couple_id", coupleId)
            .eq("status", "calling");

          // 2. Insert fresh calling record directly into database
          await supabase.from("prayer_calls").insert({
            couple_id: coupleId,
            caller_id: currentUserId,
            caller_name: currentUserName || "Partner",
            status: "calling",
          });

          // 3. Send notification to partner
          if (partnerId) {
            sendCoupleNotification({
              coupleId,
              recipientId: partnerId,
              type: "prayer",
              title: `🙏 Prayer Call from ${currentUserName || "Partner"}`,
              body: "Tap to pick call and pray together live.",
              url: "/space",
            });
          }

          // 4. Send low-latency broadcast pulse
          const voiceChannel = supabase.channel(`prayer_voice_${coupleId}`);
          voiceChannel.send({
            type: "broadcast",
            event: "prayer_call_incoming",
            payload: {
              callerId: currentUserId,
              callerName: currentUserName,
              callerAvatar: currentUserAvatar,
            },
          });
        } catch (err) {
          console.warn("Prayer call eager dispatch note:", err);
        }
      }
    };

    const handlePickCallFromEvent = () => {
      handlePickCall();
    };

    window.addEventListener("christone:start-prayer-call", handleStartCall);
    window.addEventListener("christone:pick-prayer-call", handlePickCallFromEvent);

    return () => {
      window.removeEventListener("christone:start-prayer-call", handleStartCall);
      window.removeEventListener("christone:pick-prayer-call", handlePickCallFromEvent);
    };
  }, [coupleId, currentUserId, currentUserName, currentUserAvatar, partnerId]);

  // Realtime & Fast Heartbeat Incoming Prayer Call Listener across ALL pages (Home Dashboard /space, etc.)
  React.useEffect(() => {
    if (!coupleId || !currentUserId) return;

    // Helper: Trigger incoming call UI & browser notification
    const triggerIncoming = (caller: string, callerId: string) => {
      setIncomingCall((prev) => {
        if (prev?.callerId === callerId) return prev;
        showWebNotification(`🙏 Prayer Call from ${caller}`, {
          body: "Tap to pick call and pray together live.",
          url: "/space",
        }).catch(() => {});
        return { callerName: caller, callerId };
      });
    };

    // 1. Broadcast Channel listener for zero-latency alert (<100ms)
    const broadcastChannel = supabase
      .channel(`prayer_voice_${coupleId}`, {
        config: { broadcast: { self: false } },
      })
      .on("broadcast", { event: "prayer_call_incoming" }, (payload) => {
        if (payload?.payload?.callerId && payload.payload.callerId !== currentUserId) {
          const caller = payload.payload.callerName || partnerName || "Partner";
          triggerIncoming(caller, payload.payload.callerId);
        }
      })
      .on("broadcast", { event: "prayer_call_end" }, () => {
        setIncomingCall(null);
        ringtone.stopAll();
      })
      .subscribe();

    // 2. Database changes on prayer_calls table
    const dbChannel = supabase
      .channel(`db-prayer-calls-${coupleId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "prayer_calls",
          filter: `couple_id=eq.${coupleId}`,
        },
        (payload) => {
          const row = payload.new as any;
          if (row?.status === "calling" && row.caller_id !== currentUserId) {
            const caller = row.caller_name || partnerName || "Partner";
            triggerIncoming(caller, row.caller_id);
          } else if (row?.status === "ended") {
            setIncomingCall(null);
            ringtone.stopAll();
          }
        }
      )
      .subscribe();

    // 3. Fast Heartbeat Poll (every 2s): guarantees the partner sees the call even if websockets are throttled
    const checkActiveCalls = async () => {
      if (activeCallModal) return;
      try {
        const { data } = await supabase
          .from("prayer_calls")
          .select("*")
          .eq("couple_id", coupleId)
          .eq("status", "calling")
          .neq("caller_id", currentUserId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (data) {
          const ageSecs = (Date.now() - new Date(data.created_at || "").getTime()) / 1000;
          if (ageSecs < 60) {
            const caller = data.caller_name || partnerName || "Partner";
            triggerIncoming(caller, data.caller_id);
          } else {
            setIncomingCall(null);
          }
        } else {
          setIncomingCall((prev) => {
            if (prev) ringtone.stopAll();
            return null;
          });
        }
      } catch (_) {}
    };

    checkActiveCalls();
    const pollInterval = setInterval(checkActiveCalls, 2000);

    return () => {
      clearInterval(pollInterval);
      supabase.removeChannel(broadcastChannel);
      supabase.removeChannel(dbChannel);
    };
  }, [coupleId, currentUserId, partnerName, activeCallModal]);

  // Handlers for Incoming Call Modal
  const handlePickCall = async () => {
    ringtone.stopAll();
    ringtone.playConnectedSound();
    setIncomingCall(null);
    setActiveCallIsCaller(false);
    setActiveCallModal(true);

    if (coupleId) {
      try {
        await supabase
          .from("prayer_calls")
          .update({ status: "connected", updated_at: new Date().toISOString() })
          .eq("couple_id", coupleId)
          .eq("status", "calling");

        supabase.channel(`prayer_voice_${coupleId}`).send({
          type: "broadcast",
          event: "prayer_call_picked",
          payload: { from: currentUserId },
        });
      } catch (_) {}
    }
  };

  const handleDeclineCall = async () => {
    ringtone.stopAll();
    ringtone.playEndSound();
    setIncomingCall(null);

    if (coupleId) {
      try {
        supabase.channel(`prayer_voice_${coupleId}`).send({
          type: "broadcast",
          event: "prayer_call_end",
          payload: { endedBy: currentUserId },
        });

        await supabase
          .from("prayer_calls")
          .update({ status: "ended", updated_at: new Date().toISOString() })
          .eq("couple_id", coupleId)
          .eq("status", "calling");
      } catch (_) {}
    }
  };

  const handlePrayerCompleted = async () => {
    setActiveCallModal(false);
    if (!coupleId || !currentUserId) return;

    try {
      await supabase.from("moments").insert({
        couple_id: coupleId,
        author_id: currentUserId,
        type: "prayer",
        content: `Joined hearts in covenant prayer call today. Amen. 🙏`,
      });
    } catch (_) {}
  };

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

      {/* 1. INCOMING PRAYER CALL POPUP MODAL (Prominently shows on Home Dashboard and everywhere with Ringtone!) */}
      <IncomingCallModal
        isOpen={Boolean(incomingCall && !activeCallModal)}
        callerName={incomingCall?.callerName || partnerName || "Partner"}
        callerAvatar={partnerAvatar}
        onPickCall={handlePickCall}
        onDeclineCall={handleDeclineCall}
      />

      {/* 2. ACTIVE PRAYER VOICE CALL MODAL (Live 2-Way Audio via WebRTC) */}
      <PrayerCallModal
        isOpen={activeCallModal}
        onClose={() => setActiveCallModal(false)}
        coupleId={coupleId}
        currentUserId={currentUserId}
        currentUserName={currentUserName}
        currentUserAvatar={currentUserAvatar}
        partnerId={partnerId}
        partnerName={partnerName}
        partnerAvatar={partnerAvatar}
        isCaller={activeCallIsCaller}
        onPrayerCompleted={handlePrayerCompleted}
      />

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
          {/* Left: Overlapping Avatars 32px (Link to Settings to change profile icon) */}
          <Link
            href="/settings"
            title="Edit Profile & Picture"
            className="flex items-center -space-x-2 group cursor-pointer"
          >
            <div className="w-8 h-8 rounded-full border-2 border-white bg-blush/60 flex items-center justify-center text-xs font-heading font-medium text-ink shadow-sm overflow-hidden group-hover:scale-105 transition-transform">
              {currentUserAvatar ? (
                <Image
                  src={currentUserAvatar}
                  alt={currentUserName}
                  width={32}
                  height={32}
                  className="w-full h-full object-cover"
                  unoptimized
                />
              ) : (
                userInitial
              )}
            </div>
            <div className="w-8 h-8 rounded-full border-2 border-white bg-primary text-white flex items-center justify-center text-xs font-heading font-medium shadow-sm overflow-hidden group-hover:scale-105 transition-transform">
              {partnerAvatar ? (
                <Image
                  src={partnerAvatar}
                  alt={partnerName}
                  width={32}
                  height={32}
                  className="w-full h-full object-cover"
                  unoptimized
                />
              ) : (
                partnerInitial
              )}
            </div>
          </Link>

          {/* Center: Flame streak + PRO badge */}
          <div className="flex items-center space-x-2">
            <div className="py-1 px-3 rounded-full text-xs flex items-center space-x-1.5 border border-primary/20 bg-[#FFC2CE]/40 shadow-sm text-primary">
              <Flame size={14} strokeWidth={2} className="fill-current text-primary" />
              <span className="font-semibold">
                {streakCount} {streakCount === 1 ? "day" : "days"}
              </span>
            </div>

            {isPro && (
              <Link
                href="/pricing"
                className="py-1 px-2.5 rounded-full text-xs flex items-center space-x-1 border border-amber-300/80 bg-gradient-to-r from-amber-50 to-[#FFF7ED] text-amber-900 shadow-sm font-semibold tracking-wide hover:opacity-90 transition-opacity"
              >
                <Sparkles size={12} className="text-amber-600 fill-amber-500" />
                <span>PRO</span>
              </Link>
            )}
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
