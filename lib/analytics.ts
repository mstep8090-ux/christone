import { supabase } from "@/lib/supabase/client";

export async function logEvent(
  eventType: string,
  coupleId?: string | null,
  metadata?: Record<string, any>
) {
  try {
    let resolvedCoupleId = coupleId;
    if (!resolvedCoupleId) {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;
      if (user) {
        const { data: couple } = await supabase
          .from("couples")
          .select("id")
          .or(`partner_a.eq.${user.id},partner_b.eq.${user.id}`)
          .maybeSingle();
        if (couple) resolvedCoupleId = couple.id;
      }
    }

    await supabase.from("events").insert({
      couple_id: resolvedCoupleId || null,
      event_type: eventType,
      metadata: metadata || {},
    });
  } catch (err) {
    // Analytics logging should never break user interactions
    console.debug("[Analytics Error]", err);
  }
}
