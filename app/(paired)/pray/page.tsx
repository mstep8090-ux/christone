"use client";

import * as React from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Check,
  CheckCircle2,
  Plus,
  Trash2,
  Heart,
  Flame,
  Clock,
  Lock,
  Send,
  RotateCcw,
  PhoneCall,
} from "lucide-react";
import { Pill } from "@/components/ui/pill";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { supabase } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { requestNotificationPermission } from "@/lib/notifications";

interface PrayerPoint {
  id: string;
  couple_id: string;
  text: string;
  is_answered: boolean;
  created_at: string;
}

interface StreakData {
  current_streak: number;
  longest_streak: number;
  last_prayed_at: string;
}

interface GratitudeData {
  id: string;
  user_id: string;
  content: string;
  date: string;
}

export default function PrayPage() {
  const [loading, setLoading] = React.useState(true);
  const [coupleId, setCoupleId] = React.useState<string>("");
  const [currentUserId, setCurrentUserId] = React.useState<string>("");
  const [currentUserName, setCurrentUserName] = React.useState<string>("You");
  const [currentUserAvatar, setCurrentUserAvatar] = React.useState<string | null>(null);
  const [partnerId, setPartnerId] = React.useState<string>("");
  const [partnerName, setPartnerName] = React.useState<string>("Partner");
  const [partnerAvatar, setPartnerAvatar] = React.useState<string | null>(null);

  // 1. TOP CARD TIMER & VOICE CALL STATE
  const [isPraying, setIsPraying] = React.useState<boolean>(false);
  const [timeLeft, setTimeLeft] = React.useState<number>(120); // 2 minutes (120s)
  const [prayerDone, setPrayerDone] = React.useState<boolean>(false);
  const [isSubmittingAmen, setIsSubmittingAmen] = React.useState<boolean>(false);
  const [isCallModalOpen, setIsCallModalOpen] = React.useState<boolean>(false);
  const [isCaller, setIsCaller] = React.useState<boolean>(true);
  const [partnerCalling, setPartnerCalling] = React.useState<boolean>(false);
  const [streak, setStreak] = React.useState<StreakData>({
    current_streak: 1,
    longest_streak: 1,
    last_prayed_at: new Date().toISOString(),
  });

  // 2. PRAYER POINTS LIST STATE
  const [prayerPoints, setPrayerPoints] = React.useState<PrayerPoint[]>([]);
  const [newPointText, setNewPointText] = React.useState<string>("");
  const [isAddingPoint, setIsAddingPoint] = React.useState<boolean>(false);

  // 3. GRATITUDE STATE (Private-until-both-submit)
  const todayDateString = React.useMemo(() => {
    const d = new Date();
    return d.toISOString().split("T")[0]; // YYYY-MM-DD
  }, []);

  const [myGratitude, setMyGratitude] = React.useState<string>("");
  const [mySavedGratitude, setMySavedGratitude] = React.useState<string | null>(null);
  const [partnerSavedGratitude, setPartnerSavedGratitude] = React.useState<string | null>(null);
  const [isSubmittingGratitude, setIsSubmittingGratitude] = React.useState<boolean>(false);
  const [savedGratitudeToSpace, setSavedGratitudeToSpace] = React.useState<boolean>(false);

  // Initial load
  React.useEffect(() => {
    async function loadData() {
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

          if (myProfile) {
            if (myProfile.display_name) setCurrentUserName(myProfile.display_name);
            if (myProfile.avatar_url) setCurrentUserAvatar(myProfile.avatar_url);
          }

          // Fetch couple
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
                if (pProfile.display_name) setPartnerName(pProfile.display_name);
                if (pProfile.avatar_url) setPartnerAvatar(pProfile.avatar_url);
              }
            }

            // Fetch streaks
            const { data: streakRow } = await supabase
              .from("streaks")
              .select("*")
              .eq("couple_id", coupleData.id)
              .maybeSingle();

            if (streakRow) {
              setStreak({
                current_streak: streakRow.current_streak,
                longest_streak: streakRow.longest_streak,
                last_prayed_at: streakRow.last_prayed_at,
              });
            }

            // Fetch prayer points
            const { data: points } = await supabase
              .from("prayer_points")
              .select("*")
              .eq("couple_id", coupleData.id)
              .order("created_at", { ascending: false });

            if (points) {
              setPrayerPoints(points);
            }

            // Fetch today's gratitudes
            const { data: gratitudes } = await supabase
              .from("gratitudes")
              .select("*")
              .eq("couple_id", coupleData.id)
              .eq("date", todayDateString);

            if (gratitudes && gratitudes.length > 0) {
              const myG = gratitudes.find((g) => g.user_id === user.id);
              const pG = pId ? gratitudes.find((g) => g.user_id === pId) : null;

              if (myG) setMySavedGratitude(myG.content);
              if (pG) setPartnerSavedGratitude(pG.content);
            }
          }
        }
      } catch (err) {
        console.error("Failed to load pray data:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [todayDateString]);

  // Realtime subscription for prayer points, streaks, gratitudes
  React.useEffect(() => {
    if (!coupleId) return;

    const channel = supabase
      .channel(`realtime-pray-sync-${coupleId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "prayer_points",
          filter: `couple_id=eq.${coupleId}`,
        },
        async () => {
          const { data } = await supabase
            .from("prayer_points")
            .select("*")
            .eq("couple_id", coupleId)
            .order("created_at", { ascending: false });
          if (data) setPrayerPoints(data);
        }
      )
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
          if (row) {
            setStreak({
              current_streak: row.current_streak,
              longest_streak: row.longest_streak,
              last_prayed_at: row.last_prayed_at,
            });
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "gratitudes",
          filter: `couple_id=eq.${coupleId}`,
        },
        async () => {
          const { data } = await supabase
            .from("gratitudes")
            .select("*")
            .eq("couple_id", coupleId)
            .eq("date", todayDateString);

          if (data) {
            const myG = data.find((g) => g.user_id === currentUserId);
            const pG = partnerId ? data.find((g) => g.user_id === partnerId) : null;
            if (myG) setMySavedGratitude(myG.content);
            if (pG) setPartnerSavedGratitude(pG.content);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [coupleId, currentUserId, partnerId, todayDateString]);

  // Check if opened via notification with ?call=join
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("call") === "join") {
        setIsCaller(false);
        setIsCallModalOpen(true);
      }
    }
  }, []);

  // Listen for incoming prayer call on this page (Broadcast + Database poll)
  React.useEffect(() => {
    if (!coupleId || !currentUserId) return;

    // 1. Listen on active prayer voice broadcast channel
    const channel = supabase
      .channel(`prayer_voice_${coupleId}`, {
        config: { broadcast: { self: false } },
      })
      .on("broadcast", { event: "prayer_call_incoming" }, (payload) => {
        if (payload?.payload?.callerId && payload.payload.callerId !== currentUserId) {
          setPartnerCalling(true);
        }
      })
      .on("broadcast", { event: "prayer_call_end" }, () => {
        setPartnerCalling(false);
      })
      .subscribe();

    // 2. Fast DB poll every 2s
    const checkCalling = async () => {
      try {
        const { data } = await supabase
          .from("prayer_calls")
          .select("caller_id, created_at, status")
          .eq("couple_id", coupleId)
          .eq("status", "calling")
          .neq("caller_id", currentUserId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (data) {
          const ageSecs = (Date.now() - new Date(data.created_at || "").getTime()) / 1000;
          if (ageSecs < 60) {
            setPartnerCalling(true);
          } else {
            setPartnerCalling(false);
          }
        } else {
          setPartnerCalling(false);
        }
      } catch (_) {}
    };

    checkCalling();
    const pollInterval = setInterval(checkCalling, 2000);

    return () => {
      clearInterval(pollInterval);
      supabase.removeChannel(channel);
    };
  }, [coupleId, currentUserId]);

  // 2-min Countdown Timer
  React.useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isPraying && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (isPraying && timeLeft === 0) {
      setPrayerDone(true);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPraying, timeLeft]);

  // Handlers for Prayer Voice Call
  const handleStartPrayerCall = () => {
    setPrayerDone(false);
    requestNotificationPermission().catch(() => {});
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("christone:start-prayer-call"));
    }
  };

  const handleJoinPrayerCall = () => {
    setPartnerCalling(false);
    setPrayerDone(false);
    requestNotificationPermission().catch(() => {});
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("christone:pick-prayer-call"));
    }
  };

  const handlePrayerCompleted = async () => {
    setPrayerDone(true);
    setIsCallModalOpen(false);

    if (!coupleId || !currentUserId) return;

    try {
      // 1. Insert moment type prayer
      const prayerMomentContent = `Joined hearts in covenant prayer call today. Amen. 🙏`;
      await supabase.from("moments").insert({
        couple_id: coupleId,
        author_id: currentUserId,
        type: "prayer",
        content: prayerMomentContent,
      });

      // 2. Update streaks table
      const { data: existingStreak } = await supabase
        .from("streaks")
        .select("*")
        .eq("couple_id", coupleId)
        .maybeSingle();

      const now = new Date();
      let newCurrent = 1;
      let newLongest = 1;

      if (existingStreak) {
        const lastDate = new Date(existingStreak.last_prayed_at);
        const diffHours = (now.getTime() - lastDate.getTime()) / (1000 * 60 * 60);

        if (diffHours < 24) {
          newCurrent = existingStreak.current_streak;
        } else if (diffHours < 48) {
          newCurrent = existingStreak.current_streak + 1;
        } else {
          newCurrent = 1;
        }

        newLongest = Math.max(existingStreak.longest_streak, newCurrent);

        await supabase
          .from("streaks")
          .update({
            current_streak: newCurrent,
            longest_streak: newLongest,
            last_prayed_at: now.toISOString(),
          })
          .eq("id", existingStreak.id);
      } else {
        await supabase.from("streaks").insert({
          couple_id: coupleId,
          current_streak: 1,
          longest_streak: 1,
          last_prayed_at: now.toISOString(),
        });
      }

      setStreak({
        current_streak: newCurrent,
        longest_streak: newLongest,
        last_prayed_at: now.toISOString(),
      });
    } catch (err) {
      console.error("Failed to record prayer completion:", err);
    }
  };

  // Handlers for 2-min Prayer Timer
  const handleStartPrayer = () => {
    handleStartPrayerCall();
  };

  const handleAmen = async () => {
    if (!coupleId || !currentUserId || isSubmittingAmen) return;
    setIsSubmittingAmen(true);

    try {
      // 1. Insert moment type prayer
      const prayerMomentContent = `Joined hearts in 2-minute covenant prayer today. Amen. 🙏`;
      await supabase.from("moments").insert({
        couple_id: coupleId,
        author_id: currentUserId,
        type: "prayer",
        content: prayerMomentContent,
      });

      // 2. Update streaks table
      const { data: existingStreak } = await supabase
        .from("streaks")
        .select("*")
        .eq("couple_id", coupleId)
        .maybeSingle();

      const now = new Date();
      let newCurrent = 1;
      let newLongest = 1;

      if (existingStreak) {
        const lastDate = new Date(existingStreak.last_prayed_at);
        const diffHours = (now.getTime() - lastDate.getTime()) / (1000 * 60 * 60);

        if (diffHours < 24) {
          // Already prayed recently within 24h, maintain current streak
          newCurrent = existingStreak.current_streak;
        } else if (diffHours < 48) {
          // Continued streak yesterday
          newCurrent = existingStreak.current_streak + 1;
        } else {
          // Streak reset
          newCurrent = 1;
        }

        newLongest = Math.max(existingStreak.longest_streak, newCurrent);

        await supabase
          .from("streaks")
          .update({
            current_streak: newCurrent,
            longest_streak: newLongest,
            last_prayed_at: now.toISOString(),
          })
          .eq("id", existingStreak.id);
      } else {
        await supabase.from("streaks").insert({
          couple_id: coupleId,
          current_streak: 1,
          longest_streak: 1,
          last_prayed_at: now.toISOString(),
        });
      }

      setStreak({
        current_streak: newCurrent,
        longest_streak: newLongest,
        last_prayed_at: now.toISOString(),
      });

      setPrayerDone(true);
      setIsPraying(false);
    } catch (err) {
      console.error("Failed to finish prayer:", err);
    } finally {
      setIsSubmittingAmen(false);
    }
  };

  // Handlers for Prayer Points CRUD
  const handleAddPrayerPoint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPointText.trim() || !coupleId || isAddingPoint) return;
    setIsAddingPoint(true);

    try {
      const textToAdd = newPointText.trim();
      setNewPointText("");

      const { data, error } = await supabase
        .from("prayer_points")
        .insert({
          couple_id: coupleId,
          text: textToAdd,
          is_answered: false,
        })
        .select("*")
        .single();

      if (data) {
        setPrayerPoints((prev) => [data, ...prev]);
      }
    } catch (err) {
      console.error("Failed to add prayer point:", err);
    } finally {
      setIsAddingPoint(false);
    }
  };

  const handleToggleAnswered = async (point: PrayerPoint) => {
    try {
      const newStatus = !point.is_answered;
      setPrayerPoints((prev) =>
        prev.map((p) => (p.id === point.id ? { ...p, is_answered: newStatus } : p))
      );

      await supabase
        .from("prayer_points")
        .update({ is_answered: newStatus })
        .eq("id", point.id);
    } catch (err) {
      console.error("Failed to toggle answered:", err);
    }
  };

  const handleDeletePrayerPoint = async (pointId: string) => {
    try {
      setPrayerPoints((prev) => prev.filter((p) => p.id !== pointId));
      await supabase.from("prayer_points").delete().eq("id", pointId);
    } catch (err) {
      console.error("Failed to delete prayer point:", err);
    }
  };

  // Handlers for Daily Gratitude
  const handleSubmitGratitude = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!myGratitude.trim() || !coupleId || !currentUserId || isSubmittingGratitude) return;
    setIsSubmittingGratitude(true);

    try {
      const content = myGratitude.trim();

      const { data } = await supabase
        .from("gratitudes")
        .upsert(
          {
            couple_id: coupleId,
            user_id: currentUserId,
            date: todayDateString,
            content,
          },
          { onConflict: "couple_id,user_id,date" }
        )
        .select("*")
        .single();

      if (data) {
        setMySavedGratitude(data.content);
        setMyGratitude("");
      }
    } catch (err) {
      console.error("Failed to submit gratitude:", err);
    } finally {
      setIsSubmittingGratitude(false);
    }
  };

  const handleSaveGratitudeToSpace = async () => {
    if (!coupleId || !currentUserId || !mySavedGratitude || !partnerSavedGratitude || savedGratitudeToSpace)
      return;

    try {
      const contentText = `Today's Shared Gratitude 🌸\n\n${currentUserName}: "${mySavedGratitude}"\n\n${partnerName}: "${partnerSavedGratitude}"`;

      await supabase.from("moments").insert({
        couple_id: coupleId,
        author_id: currentUserId,
        type: "note",
        content: contentText,
      });

      setSavedGratitudeToSpace(true);
    } catch (err) {
      console.error("Failed to save gratitude moment:", err);
    }
  };

  // Format seconds mm:ss
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const isBothGratitudeSubmitted = Boolean(mySavedGratitude && partnerSavedGratitude);

  if (loading) {
    return (
      <div className="py-20 text-center text-xs text-inkSoft">
        Loading Prayer Space...
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      {/* Top Page Header */}
      <header className="space-y-1">
        <div className="flex items-center justify-between">
          <Pill>Prayer Sanctuary</Pill>
          {streak?.current_streak > 0 && (
            <div className="flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-[#FFC2CE]/40 border border-primary/20 text-primary text-xs font-semibold">
              <Flame size={13} strokeWidth={2} className="fill-current text-primary" />
              <span>{streak.current_streak} Day Streak</span>
            </div>
          )}
        </div>
        <h1 className="font-heading text-3xl text-ink font-normal pt-1">
          Prayer & Gratitude
        </h1>
        <p className="text-sm text-inkSoft">
          Agreed in prayer, united in love.
        </p>
      </header>

      {/* 1. TOP CARD: Headline EXACT "Pray together today?" + minimal verse + button EXACT "Start 2-min prayer" */}
      <Card className="rounded-[24px] bg-white border border-border p-6 shadow-[0_8px_32px_rgba(255,90,126,0.08)] space-y-5 text-center relative overflow-hidden">
        {/* Soft blush background accent */}
        <div className="absolute -top-16 -right-16 w-36 h-36 rounded-full bg-blush/20 blur-2xl pointer-events-none" />

        {isPraying ? (
          /* ACTIVE 2-MIN TIMER VIEW */
          <div className="space-y-5 py-2">
            <div className="space-y-1">
              <Pill className="text-[10px] py-0.5 px-2.5">Covenant Prayer</Pill>
              <h2 className="font-heading text-2xl text-ink font-normal pt-1">
                Holding Hands in Prayer
              </h2>
              <p className="text-xs text-inkSoft max-w-xs mx-auto">
                Take this quiet moment to pray for each other and listen to God&apos;s peace.
              </p>
            </div>

            {/* Soft Blush Circle Animation & Countdown */}
            <div className="relative w-44 h-44 mx-auto flex items-center justify-center my-3">
              {/* Outer soft pulsing ring */}
              <motion.div
                animate={{
                  scale: [1, 1.08, 1],
                  opacity: [0.35, 0.7, 0.35],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="absolute inset-0 rounded-full bg-[#FFC2CE]/35"
              />

              {/* Inner ring with illustration */}
              <div className="relative w-36 h-36 rounded-full bg-white border border-border shadow-xs flex flex-col items-center justify-center space-y-1 z-10">
                <Image
                  src="/illustrations/prayer-hands.svg"
                  alt="Praying hands"
                  width={48}
                  height={48}
                  className="w-12 h-12 object-contain"
                />
                <span className="font-heading text-2xl text-ink font-normal tracking-wider">
                  {formatTime(timeLeft)}
                </span>
                <span className="text-[10px] text-inkSoft">2-min stillness</span>
              </div>
            </div>

            {/* Button EXACT: "Amen" at end */}
            <div className="pt-2 max-w-xs mx-auto">
              <button
                type="button"
                disabled={isSubmittingAmen}
                onClick={handleAmen}
                className="w-full h-12 rounded-full bg-primary hover:bg-deep text-white font-medium text-sm transition-all flex items-center justify-center space-x-2 shadow-[0_8px_32px_rgba(255,90,126,0.18)] active:scale-[0.99]"
              >
                {isSubmittingAmen ? (
                  <span>Saving Prayer...</span>
                ) : (
                  <>
                    <Check size={16} strokeWidth={2} />
                    <span>Amen</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ) : prayerDone ? (
          /* PRAYER COMPLETED CELEBRATION */
          <div className="space-y-4 py-2">
            <div className="w-12 h-12 rounded-full bg-[#DDF2E6] border border-[#BCE7CE] flex items-center justify-center mx-auto text-[#2C6E49]">
              <CheckCircle2 size={24} strokeWidth={1.5} />
            </div>

            <div className="space-y-1">
              <h2 className="font-heading text-2xl text-ink font-normal">
                Amen! Shared in Faith
              </h2>
              <p className="text-xs text-inkSoft max-w-xs mx-auto leading-relaxed">
                Your 2-minute covenant prayer was recorded to your shared space. God honors your agreement.
              </p>
            </div>

            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={handleStartPrayer}
                className="h-10 px-5 rounded-full bg-white hover:bg-canvas text-ink border border-border text-xs font-medium transition-colors flex items-center space-x-1.5"
              >
                <RotateCcw size={13} strokeWidth={1.5} />
                <span>Pray Again</span>
              </button>
            </div>
          </div>
        ) : partnerCalling ? (
          /* INCOMING PRAYER CALL VIEW */
          <div className="space-y-4 py-2">
            <div className="w-16 h-16 rounded-full bg-[#2C6E49] text-white flex items-center justify-center mx-auto animate-pulse shadow-md">
              <PhoneCall size={28} strokeWidth={2} />
            </div>

            <div className="space-y-1">
              <span className="inline-block text-[11px] font-semibold text-[#2C6E49] uppercase tracking-wider bg-[#DDF2E6] px-3 py-0.5 rounded-full">
                Incoming Call
              </span>
              <h2 className="font-heading text-2xl sm:text-3xl text-ink font-normal">
                {partnerName} is calling for prayer
              </h2>
              <p className="text-xs text-inkSoft max-w-xs mx-auto">
                Tap below to pick call and pray together live.
              </p>
            </div>

            <div className="pt-2 max-w-xs mx-auto">
              <button
                type="button"
                onClick={handleJoinPrayerCall}
                className="w-full h-12 rounded-full bg-[#2C6E49] hover:bg-[#23583A] text-white font-semibold text-sm transition-all flex items-center justify-center space-x-2 shadow-[0_8px_32px_rgba(44,110,73,0.25)] active:scale-[0.99] animate-pulse"
              >
                <PhoneCall size={18} strokeWidth={2} />
                <span>Pick Call</span>
              </button>
            </div>
          </div>
        ) : (
          /* DEFAULT CARD: Headline EXACT "Pray together today?" */
          <div className="space-y-4">
            <div className="w-16 h-16 rounded-full bg-blush/20 border border-primary/20 flex items-center justify-center mx-auto">
              <Image
                src="/illustrations/prayer-hands.svg"
                alt="Praying hands"
                width={44}
                height={44}
                className="w-11 h-11 object-contain"
              />
            </div>

            <div className="space-y-1.5">
              <h2 className="font-heading text-2xl sm:text-3xl text-ink font-normal">
                Pray together today?
              </h2>
              {/* Minimal verse: "Where two agree..." */}
              <p className="text-xs text-inkSoft italic max-w-sm mx-auto leading-relaxed">
                &ldquo;If two of you on earth agree about anything they ask for, it will be done for them by my Father in heaven.&rdquo;
              </p>
              <span className="text-[10px] text-inkSoft/80 block uppercase tracking-wider">
                — Matthew 18:19
              </span>
            </div>

            {/* Button: "Start prayer call" */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleStartPrayerCall}
                className="w-full h-12 rounded-full bg-primary hover:bg-deep text-white font-medium text-sm transition-all flex items-center justify-center space-x-2 shadow-[0_8px_32px_rgba(255,90,126,0.18)] active:scale-[0.99]"
              >
                <PhoneCall size={16} strokeWidth={2} className="text-white/90" />
                <span>Start prayer call</span>
              </button>
            </div>
          </div>
        )}
      </Card>

      {/* 2. BELOW: PRAYER LIST (Table prayer_points: id, couple_id, text, is_answered bool) */}
      <Card className="rounded-[24px] bg-white border border-border p-6 shadow-[0_8px_32px_rgba(255,90,126,0.08)] space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-primary uppercase tracking-wider block">
              Shared Requests
            </span>
            <h3 className="font-heading text-2xl text-ink font-normal pt-0.5">
              Our Prayer List
            </h3>
          </div>
          <span className="text-xs text-inkSoft font-medium">
            {prayerPoints.filter((p) => p.is_answered).length} of {prayerPoints.length} answered
          </span>
        </div>

        {/* Add Input: Placeholder EXACT "Add prayer point" */}
        <form onSubmit={handleAddPrayerPoint} className="flex gap-2">
          <input
            type="text"
            value={newPointText}
            onChange={(e) => setNewPointText(e.target.value)}
            placeholder="Add prayer point"
            className="flex-1 h-12 px-4 rounded-[16px] border border-border bg-canvas text-xs text-ink placeholder:text-inkSoft/60 focus:outline-none focus:border-primary transition-colors font-body"
          />
          <button
            type="submit"
            disabled={!newPointText.trim() || isAddingPoint}
            className={cn(
              "h-12 px-4 rounded-[16px] text-white font-medium text-xs transition-all flex items-center justify-center shadow-xs",
              newPointText.trim()
                ? "bg-primary hover:bg-deep cursor-pointer"
                : "bg-inkSoft/30 cursor-not-allowed"
            )}
          >
            <Plus size={16} strokeWidth={2} />
          </button>
        </form>

        {/* Checklist List */}
        <div className="space-y-2.5 pt-1">
          {prayerPoints.length === 0 ? (
            <p className="text-xs text-inkSoft text-center py-6">
              No prayer points yet. Add things you are believing God for together.
            </p>
          ) : (
            prayerPoints.map((point) => (
              <div
                key={point.id}
                className={cn(
                  "p-3.5 rounded-[18px] border transition-all flex items-center justify-between gap-3 select-none",
                  point.is_answered
                    ? "bg-[#DDF2E6]/40 border-[#BCE7CE]"
                    : "bg-white border-border hover:border-primary/30"
                )}
              >
                {/* Text and Toggle Checkbox */}
                <div
                  className="flex items-center space-x-3 flex-1 min-w-0 cursor-pointer"
                  onClick={() => handleToggleAnswered(point)}
                >
                  <div
                    className={cn(
                      "w-5 h-5 rounded-[6px] border flex items-center justify-center transition-colors shrink-0",
                      point.is_answered
                        ? "bg-[#2C6E49] border-[#2C6E49] text-white"
                        : "border-border bg-canvas hover:border-primary"
                    )}
                  >
                    {point.is_answered && <Check size={13} strokeWidth={2.5} />}
                  </div>

                  <span
                    className={cn(
                      "text-xs font-body leading-snug break-words",
                      point.is_answered
                        ? "text-inkSoft line-through decoration-inkSoft/50"
                        : "text-ink"
                    )}
                  >
                    {point.text}
                  </span>
                </div>

                {/* Right: Answered pill or delete */}
                <div className="flex items-center space-x-2 shrink-0">
                  {point.is_answered && (
                    <span className="text-[10px] text-[#2C6E49] font-semibold px-2 py-0.5 rounded-full bg-[#DDF2E6] border border-[#BCE7CE]">
                      Answered
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDeletePrayerPoint(point.id)}
                    className="p-1 rounded-full text-inkSoft/40 hover:text-deep transition-colors"
                    title="Remove point"
                  >
                    <Trash2 size={13} strokeWidth={1.5} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* 3. GRATITUDE: Card "One thing I'm grateful for about you today" (Private-until-both-submit flow) */}
      <Card className="rounded-[24px] bg-white border border-border p-6 shadow-[0_8px_32px_rgba(255,90,126,0.08)] space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-primary uppercase tracking-wider block">
              Daily Appreciation
            </span>
            <h3 className="font-heading text-2xl text-ink font-normal pt-0.5">
              One thing I&apos;m grateful for about you today
            </h3>
          </div>
          <Heart size={20} strokeWidth={1.5} className="text-primary shrink-0" />
        </div>

        {isBothGratitudeSubmitted ? (
          /* REVEAL STATE: BOTH HAVE SUBMITTED */
          <div className="space-y-4 pt-1">
            <div className="p-3.5 rounded-[18px] bg-blush/25 border border-primary/20 text-center space-y-1">
              <span className="text-xs font-semibold text-ink">
                Gratitudes Revealed! 💕
              </span>
              <p className="text-[11px] text-inkSoft">
                Both of you shared what you cherish today.
              </p>
            </div>

            {/* Side-by-side gratitudes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {/* My Gratitude */}
              <div className="p-4 rounded-[20px] bg-canvas border border-border space-y-2">
                <div className="flex items-center space-x-2">
                  <Avatar
                    src={currentUserAvatar || undefined}
                    fallback={currentUserName[0] || "Y"}
                    size="sm"
                  />
                  <div>
                    <span className="font-semibold text-ink block text-xs">
                      {currentUserName}
                    </span>
                    <span className="text-[10px] text-inkSoft">Grateful for {partnerName}</span>
                  </div>
                </div>
                <p className="text-ink leading-relaxed font-body italic pt-1">
                  &ldquo;{mySavedGratitude}&rdquo;
                </p>
              </div>

              {/* Partner Gratitude */}
              <div className="p-4 rounded-[20px] bg-blush/20 border border-blush/40 space-y-2">
                <div className="flex items-center space-x-2">
                  <Avatar
                    src={partnerAvatar || undefined}
                    fallback={partnerName[0] || "P"}
                    size="sm"
                  />
                  <div>
                    <span className="font-semibold text-deep block text-xs">
                      {partnerName}
                    </span>
                    <span className="text-[10px] text-inkSoft">Grateful for {currentUserName}</span>
                  </div>
                </div>
                <p className="text-ink leading-relaxed font-body italic pt-1">
                  &ldquo;{partnerSavedGratitude}&rdquo;
                </p>
              </div>
            </div>

            {/* Button Save to Space */}
            <button
              type="button"
              onClick={handleSaveGratitudeToSpace}
              disabled={savedGratitudeToSpace}
              className={cn(
                "w-full h-12 rounded-full font-medium text-xs transition-all flex items-center justify-center space-x-2 shadow-xs active:scale-[0.99]",
                savedGratitudeToSpace
                  ? "bg-[#DDF2E6] text-[#2C6E49] border border-[#BCE7CE]"
                  : "bg-primary hover:bg-deep text-white"
              )}
            >
              {savedGratitudeToSpace ? (
                <>
                  <Check size={16} strokeWidth={1.5} />
                  <span>Saved to Our Space ✓</span>
                </>
              ) : (
                <>
                  <Sparkles size={16} strokeWidth={1.5} />
                  <span>Save to Our Space</span>
                </>
              )}
            </button>
          </div>
        ) : mySavedGratitude ? (
          /* USER HAS SUBMITTED, PARTNER HAS NOT: SEALED VIEW */
          <div className="space-y-4 pt-1">
            <div className="p-5 rounded-[20px] bg-canvas border border-border space-y-3 text-center">
              <div className="w-10 h-10 rounded-full bg-blush/30 border border-primary/20 flex items-center justify-center mx-auto text-primary">
                <Lock size={16} strokeWidth={1.5} />
              </div>
              <div className="space-y-1">
                <span className="text-xs font-semibold text-ink block">
                  Your Gratitude is Sealed
                </span>
                <p className="text-xs text-inkSoft max-w-xs mx-auto leading-relaxed">
                  Private until both submit! As soon as {partnerName} shares their appreciation, both will unlock side by side.
                </p>
              </div>
            </div>

            {/* Preview of user's own answer */}
            <div className="p-3.5 rounded-[16px] bg-white border border-border text-xs space-y-1">
              <span className="text-[10px] text-inkSoft uppercase tracking-wider block font-medium">
                Your Note Today
              </span>
              <p className="text-ink italic">&ldquo;{mySavedGratitude}&rdquo;</p>
            </div>
          </div>
        ) : (
          /* USER HAS NOT SUBMITTED: INPUT FORM */
          <form onSubmit={handleSubmitGratitude} className="space-y-3">
            <div className="space-y-1.5">
              <p className="text-xs text-inkSoft leading-relaxed">
                Private until both submit. Share one specific quality, gesture, or moment you appreciate about {partnerName} today.
              </p>
              <textarea
                value={myGratitude}
                onChange={(e) => setMyGratitude(e.target.value)}
                placeholder="Share honestly... (e.g. How patient you were with me, your laughter, your morning prayer)"
                rows={3}
                className="w-full p-4 rounded-[16px] border border-border bg-canvas text-xs text-ink placeholder:text-inkSoft/60 focus:outline-none focus:border-primary transition-colors resize-none font-body leading-relaxed"
              />
            </div>

            <button
              type="submit"
              disabled={!myGratitude.trim() || isSubmittingGratitude}
              className={cn(
                "w-full h-12 rounded-full font-medium text-xs transition-all flex items-center justify-center space-x-2 shadow-xs active:scale-[0.99]",
                myGratitude.trim()
                  ? "bg-primary hover:bg-deep text-white cursor-pointer"
                  : "bg-canvas text-inkSoft border border-border cursor-not-allowed opacity-60"
              )}
            >
              {isSubmittingGratitude ? (
                <span>Sealing Note...</span>
              ) : (
                <>
                  <Send size={14} strokeWidth={1.5} />
                  <span>Share Gratitude</span>
                </>
              )}
            </button>
          </form>
        )}
      </Card>
    </div>
  );
}
