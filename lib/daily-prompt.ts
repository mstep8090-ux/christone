import { supabase } from "@/lib/supabase/client";

export interface DailyPromptData {
  id: string;
  date: string;
  couple_id: string;
  prompt_id: string;
  prompt: {
    id: string;
    deck_id: string;
    prompt_text: string;
    order_index: number;
    deck: {
      id: string;
      title: string;
      category: string;
      icon_name: string;
      is_intimacy: boolean;
    };
  };
}

/**
 * Returns today's UTC date string YYYY-MM-DD
 */
export function getTodayDateString(): string {
  const d = new Date();
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Deterministic hash of string into positive 32-bit integer
 */
function hashSeed(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/**
 * Logic: getDailyPrompt(couple_id) picks one random prompt from all non-intimacy decks
 * that has not been answered yet by the couple.
 * Deterministic: same for both users for that day (uses date + couple_id seed).
 * Stored in daily_questions table (couple_id, prompt_id, date).
 */
export async function getDailyPrompt(couple_id: string): Promise<DailyPromptData | null> {
  if (!couple_id) return null;

  const todayStr = getTodayDateString();

  try {
    // 1. Check if daily question already exists for this couple & date
    const { data: existing } = await supabase
      .from("daily_questions")
      .select(`
        id,
        date,
        couple_id,
        prompt_id,
        talk_prompts (
          id,
          deck_id,
          prompt_text,
          order_index,
          talk_decks (
            id,
            title,
            category,
            icon_name,
            is_intimacy
          )
        )
      `)
      .eq("couple_id", couple_id)
      .eq("date", todayStr)
      .maybeSingle();

    if (existing && existing.talk_prompts) {
      const p: any = existing.talk_prompts;
      return {
        id: existing.id,
        date: existing.date,
        couple_id: existing.couple_id,
        prompt_id: existing.prompt_id,
        prompt: {
          id: p.id,
          deck_id: p.deck_id,
          prompt_text: p.prompt_text,
          order_index: p.order_index,
          deck: p.talk_decks,
        },
      };
    }

    // 2. No question recorded for today yet. Fetch all non-intimacy decks
    const { data: decks } = await supabase
      .from("talk_decks")
      .select("id, title, category, icon_name, is_intimacy")
      .eq("is_intimacy", false);

    if (!decks || decks.length === 0) return null;

    const deckMap = new Map<string, any>(decks.map((d) => [d.id, d]));
    const nonIntimacyDeckIds = Array.from(deckMap.keys());

    // 3. Fetch all prompts in non-intimacy decks
    const { data: allPrompts } = await supabase
      .from("talk_prompts")
      .select("id, deck_id, prompt_text, order_index")
      .in("deck_id", nonIntimacyDeckIds)
      .order("order_index", { ascending: true });

    if (!allPrompts || allPrompts.length === 0) return null;

    // 4. Fetch answered prompt IDs for this couple to exclude answered prompts
    const { data: answeredRows } = await supabase
      .from("talk_answers")
      .select("prompt_id")
      .eq("couple_id", couple_id);

    const answeredPromptIds = new Set(answeredRows?.map((r) => r.prompt_id) || []);

    // Filter out already answered prompts
    const unansweredPrompts = allPrompts.filter((p) => !answeredPromptIds.has(p.id));

    // Fall back to all non-intimacy prompts if all are answered
    const candidatePool = unansweredPrompts.length > 0 ? unansweredPrompts : allPrompts;

    // Sort candidate pool deterministically by id before indexing with seed
    candidatePool.sort((a, b) => a.id.localeCompare(b.id));

    // 5. Deterministic pick using date + couple_id seed
    const seed = hashSeed(`${todayStr}_${couple_id}`);
    const selectedPrompt = candidatePool[seed % candidatePool.length];
    const deck = deckMap.get(selectedPrompt.deck_id);

    // 6. Insert into daily_questions
    const { data: inserted, error: insertError } = await supabase
      .from("daily_questions")
      .insert({
        couple_id,
        prompt_id: selectedPrompt.id,
        date: todayStr,
      })
      .select("id, date, couple_id, prompt_id")
      .single();

    if (insertError) {
      // Possible race condition if partner inserted concurrently, re-fetch
      const { data: refetched } = await supabase
        .from("daily_questions")
        .select(`
          id,
          date,
          couple_id,
          prompt_id,
          talk_prompts (
            id,
            deck_id,
            prompt_text,
            order_index,
            talk_decks (
              id,
              title,
              category,
              icon_name,
              is_intimacy
            )
          )
        `)
        .eq("couple_id", couple_id)
        .eq("date", todayStr)
        .maybeSingle();

      if (refetched && refetched.talk_prompts) {
        const p: any = refetched.talk_prompts;
        return {
          id: refetched.id,
          date: refetched.date,
          couple_id: refetched.couple_id,
          prompt_id: refetched.prompt_id,
          prompt: {
            id: p.id,
            deck_id: p.deck_id,
            prompt_text: p.prompt_text,
            order_index: p.order_index,
            deck: p.talk_decks,
          },
        };
      }
    }

    return {
      id: inserted ? inserted.id : selectedPrompt.id,
      date: todayStr,
      couple_id,
      prompt_id: selectedPrompt.id,
      prompt: {
        id: selectedPrompt.id,
        deck_id: selectedPrompt.deck_id,
        prompt_text: selectedPrompt.prompt_text,
        order_index: selectedPrompt.order_index,
        deck,
      },
    };
  } catch (err) {
    console.error("Error in getDailyPrompt:", err);
    return null;
  }
}
