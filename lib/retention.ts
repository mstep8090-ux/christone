import { supabase } from "@/lib/supabase/client";

export interface BadgeItem {
  id: string;
  title: string;
  description: string;
  icon: string;
  awarded: boolean;
  awarded_at?: string;
}

export interface StreakInfo {
  count: number;
  last_activity: string;
}

export const ALL_BADGES: { id: string; title: string; description: string; icon: string }[] = [
  {
    id: "first_talk",
    title: "First Talk",
    description: "Completed your first talk together",
    icon: "message-circle",
  },
  {
    id: "streak_7",
    title: "7-Day Streak",
    description: "Maintained a 7-day connection streak",
    icon: "flame",
  },
  {
    id: "intercessors",
    title: "Intercessors",
    description: "Lifted 7 prayers in unity",
    icon: "sparkles",
  },
  {
    id: "gist_masters",
    title: "Gist Masters",
    description: "Played 20 couple games together",
    icon: "smile",
  },
  {
    id: "deep_talkers",
    title: "Deep Talkers",
    description: "Answered 50 heart-opening prompts",
    icon: "heart",
  },
  {
    id: "vision_setters",
    title: "Vision Setters",
    description: "Defined your shared relationship vision",
    icon: "compass",
  },
];

/**
 * Record activity for couple and trigger badge check
 */
export async function recordCoupleActivity(coupleId: string): Promise<StreakInfo | null> {
  if (!coupleId) return null;
  try {
    const { data, error } = await (supabase.rpc as any)("record_couple_activity", {
      p_couple_id: coupleId,
    });

    if (error) {
      console.warn("RPC record_couple_activity fallback:", error);
      // Fallback: direct update
      const today = new Date().toISOString().split("T")[0];
      const { data: existing } = await supabase
        .from("streaks")
        .select("*")
        .eq("couple_id", coupleId)
        .maybeSingle();

      if (!existing) {
        await supabase.from("streaks").insert({
          couple_id: coupleId,
          count: 1,
          last_activity: today,
        });
        return { count: 1, last_activity: today };
      } else {
        const lastAct = existing.last_activity;
        let newCount = existing.count || 1;
        if (lastAct !== today) {
          const diffDays = Math.floor(
            (new Date(today).getTime() - new Date(lastAct).getTime()) / (1000 * 60 * 60 * 24)
          );
          if (diffDays === 1) {
            newCount += 1;
          } else if (diffDays > 1) {
            newCount = 1;
          }
          await supabase
            .from("streaks")
            .update({ count: newCount, last_activity: today, updated_at: new Date().toISOString() })
            .eq("couple_id", coupleId);
        }
        return { count: newCount, last_activity: today };
      }
    }

    return (data as any) || { count: 1, last_activity: new Date().toISOString().split("T")[0] };
  } catch (err) {
    console.error("Failed to record couple activity:", err);
    return null;
  }
}

/**
 * Get couple streak
 */
export async function getCoupleStreak(coupleId: string): Promise<number> {
  if (!coupleId) return 1;
  try {
    const { data } = await supabase
      .from("streaks")
      .select("count, last_activity")
      .eq("couple_id", coupleId)
      .maybeSingle();

    if (data?.count) {
      return data.count;
    }
    return 1;
  } catch {
    return 1;
  }
}

/**
 * Fetch all badges with awarded state for couple
 */
export async function getCoupleBadges(coupleId: string): Promise<BadgeItem[]> {
  try {
    const { data: awardedRows } = await supabase
      .from("couple_badges")
      .select("badge_id, awarded_at")
      .eq("couple_id", coupleId);

    const awardedMap = new Map<string, string>();
    if (awardedRows) {
      awardedRows.forEach((r) => awardedMap.set(r.badge_id, r.awarded_at));
    }

    return ALL_BADGES.map((b) => ({
      ...b,
      awarded: awardedMap.has(b.id),
      awarded_at: awardedMap.get(b.id),
    }));
  } catch {
    return ALL_BADGES.map((b) => ({ ...b, awarded: false }));
  }
}
