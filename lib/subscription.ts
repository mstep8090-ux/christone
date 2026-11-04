import { supabase } from "@/lib/supabase/client";

export const FREE_TALK_LIMIT = 20;
export const FREE_GAME_DAILY_LIMIT = 1;

export interface SubscriptionStatus {
  coupleId: string;
  status: "free" | "premium";
  isPremium: boolean;
  planType: "monthly" | "yearly";
  expiresAt: string | null;
}

export interface AccessCheckResult {
  allowed: boolean;
  isPremium: boolean;
  reason?: "talk_limit" | "game_limit";
  currentCount: number;
  maxLimit: number;
}

/**
 * Get current subscription status for a couple.
 * Defaults to free if no record exists.
 */
export async function getCoupleSubscription(coupleId: string): Promise<SubscriptionStatus> {
  try {
    const { data, error } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("couple_id", coupleId)
      .maybeSingle();

    if (error || !data) {
      return {
        coupleId,
        status: "free",
        isPremium: false,
        planType: "monthly",
        expiresAt: null,
      };
    }

    const isExpired = data.expires_at ? new Date(data.expires_at) < new Date() : false;
    const isPremium = data.status === "premium" && !isExpired;

    return {
      coupleId,
      status: isPremium ? "premium" : "free",
      isPremium,
      planType: (data.plan_type as "monthly" | "yearly") || "monthly",
      expiresAt: data.expires_at,
    };
  } catch (err) {
    console.error("Error fetching couple subscription:", err);
    return {
      coupleId,
      status: "free",
      isPremium: false,
      planType: "monthly",
      expiresAt: null,
    };
  }
}

/**
 * Count total talk answers for this couple
 */
export async function getTalkAnswersCount(coupleId: string): Promise<number> {
  try {
    const { count, error } = await supabase
      .from("talk_answers")
      .select("id", { count: "exact", head: true })
      .eq("couple_id", coupleId);

    if (error) {
      console.error("Error counting talk answers:", error);
      return 0;
    }
    return count || 0;
  } catch (err) {
    console.error("Error counting talk answers:", err);
    return 0;
  }
}

/**
 * Count games played by this couple today
 */
export async function getGamesPlayedTodayCount(coupleId: string): Promise<number> {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const { count, error } = await supabase
      .from("game_plays")
      .select("id", { count: "exact", head: true })
      .eq("couple_id", coupleId)
      .gte("created_at", startOfDay.toISOString());

    if (error) {
      console.error("Error counting today's games:", error);
      return 0;
    }
    return count || 0;
  } catch (err) {
    console.error("Error counting today's games:", err);
    return 0;
  }
}

/**
 * Check if the couple can access a talk or play another game
 */
export async function checkAccess(
  coupleId: string,
  feature: "talks" | "games"
): Promise<AccessCheckResult> {
  const sub = await getCoupleSubscription(coupleId);
  if (sub.isPremium) {
    return {
      allowed: true,
      isPremium: true,
      currentCount: 0,
      maxLimit: Infinity,
    };
  }

  if (feature === "talks") {
    const talkCount = await getTalkAnswersCount(coupleId);
    const allowed = talkCount < FREE_TALK_LIMIT;
    return {
      allowed,
      isPremium: false,
      reason: allowed ? undefined : "talk_limit",
      currentCount: talkCount,
      maxLimit: FREE_TALK_LIMIT,
    };
  }

  // Games feature: 1 game per day for free users
  const gamesToday = await getGamesPlayedTodayCount(coupleId);
  const allowed = gamesToday < FREE_GAME_DAILY_LIMIT;
  return {
    allowed,
    isPremium: false,
    reason: allowed ? undefined : "game_limit",
    currentCount: gamesToday,
    maxLimit: FREE_GAME_DAILY_LIMIT,
  };
}
