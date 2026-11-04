"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Sparkles, Check, Heart, RefreshCw } from "lucide-react";
import { Pill } from "@/components/ui/pill";
import { Card } from "@/components/ui/card";
import { supabase } from "@/lib/supabase/client";
import { Paywall } from "@/components/paywall";
import { checkAccess, getCoupleSubscription } from "@/lib/subscription";
import { recordCoupleActivity } from "@/lib/retention";
import {
  THIS_OR_THAT_PROMPTS,
  WOULD_YOU_RATHER_PROMPTS,
  DARE_KINGDOM_PROMPTS,
  TRUTH_FALLBACK_PROMPTS,
  type GameChoicePrompt,
  type DarePrompt,
} from "@/lib/game-prompts";
import { cn } from "@/lib/utils";
import dynamic from "next/dynamic";
import { SkeletonList } from "@/components/ui/skeleton-card";
import { QuizGame } from "@/components/games/quiz-game";
import { BibleTriviaGame } from "@/components/games/bible-trivia-game";
import { PhotoChallengeGame } from "@/components/games/photo-challenge-game";

const DrawingBattleGame = dynamic(
  () => import("@/components/games/drawing-battle-game").then((m) => m.DrawingBattleGame),
  {
    ssr: false,
    loading: () => <SkeletonList count={3} />,
  }
);

const GAME_ICONS: Record<string, string> = {
  thisorthat: "/icons/games/thisorthat.svg",
  wyr: "/icons/games/wyr.svg",
  truth: "/icons/games/truth.svg",
  dare: "/icons/games/dare.svg",
  quiz: "/icons/games/quiz.svg",
  draw: "/icons/games/draw.svg",
  photo: "/icons/games/photo.svg",
  trivia: "/icons/games/trivia.svg",
};

function GameDetailContent() {
  const params = useParams();
  const gameId = params?.id as string;

  const [loading, setLoading] = React.useState(true);
  const [game, setGame] = React.useState<any>(null);
  const [coupleId, setCoupleId] = React.useState<string>("");
  const [currentUserId, setCurrentUserId] = React.useState<string>("");
  const [currentUserName, setCurrentUserName] = React.useState<string>("You");
  const [partnerId, setPartnerId] = React.useState<string>("");
  const [partnerName, setPartnerName] = React.useState<string>("Partner");
  const [userStage, setUserStage] = React.useState<string>("courting");

  // Choice Game States (This or That & Would You Rather)
  const [roundIndex, setRoundIndex] = React.useState<number>(0);
  const [myChoice, setMyChoice] = React.useState<"a" | "b" | null>(null);
  const [partnerChoice, setPartnerChoice] = React.useState<"a" | "b" | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState<boolean>(false);
  const [savedToSpace, setSavedToSpace] = React.useState<boolean>(false);
  const [currentGamePlayId, setCurrentGamePlayId] = React.useState<string | null>(null);

  // Truth Game States
  const [truthPrompts, setTruthPrompts] = React.useState<string[]>([]);
  const [currentTruthIndex, setCurrentTruthIndex] = React.useState<number>(0);
  const [isTruthDone, setIsTruthDone] = React.useState<boolean>(false);

  // Dare Game States
  const [currentDareIndex, setCurrentDareIndex] = React.useState<number>(0);
  const [isDareDone, setIsDareDone] = React.useState<boolean>(false);

  // Paywall states
  const searchParams = useSearchParams();
  const [isPaywallOpen, setIsPaywallOpen] = React.useState(false);
  const [isPremium, setIsPremium] = React.useState(false);

  const paywallParam = searchParams.get("paywall");

  React.useEffect(() => {
    if (paywallParam === "game_limit") {
      setIsPaywallOpen(true);
    }
  }, [paywallParam]);

  // Initial load
  React.useEffect(() => {
    async function loadData() {
      if (!gameId) return;

      if (typeof window !== "undefined") {
        const localStage = localStorage.getItem("stage");
        if (localStage) setUserStage(localStage);
      }

      try {
        // 1. Current user
        const {
          data: { user },
        } = await supabase.auth.getUser();

        let uid = user?.id;
        if (!uid && typeof window !== "undefined") {
          uid = localStorage.getItem("user_id") || "";
        }

        if (uid) {
          setCurrentUserId(uid);

          const { data: myProfile } = await supabase
            .from("profiles")
            .select("display_name, stage")
            .eq("id", uid)
            .maybeSingle();

          if (myProfile) {
            if (myProfile.display_name) setCurrentUserName(myProfile.display_name);
            if (myProfile.stage) setUserStage(myProfile.stage);
          }

          // 2. Couple - find paired first or latest couple
          const { data: coupleList } = await supabase
            .from("couples")
            .select("*")
            .or(`partner_a.eq.${uid},partner_b.eq.${uid}`)
            .order("created_at", { ascending: false });

          const coupleData =
            coupleList?.find((c) => c.status === "paired") ||
            coupleList?.[0] ||
            null;

          if (coupleData) {
            setCoupleId(coupleData.id);
            if (typeof window !== "undefined") {
              localStorage.setItem("couple_id", coupleData.id);
            }
            const sub = await getCoupleSubscription(coupleData.id);
            setIsPremium(sub.isPremium);

            const pId =
              coupleData.partner_a === uid
                ? coupleData.partner_b
                : coupleData.partner_a;

            if (pId) {
              setPartnerId(pId);
              const { data: pProfile } = await supabase
                .from("profiles")
                .select("display_name")
                .eq("id", pId)
                .maybeSingle();

              if (pProfile?.display_name) {
                setPartnerName(pProfile.display_name);
              }
            }
          }
        }

        // 3. Game by ID or type
        const { data: gameData } = await supabase
          .from("games")
          .select("*")
          .eq("id", gameId)
          .maybeSingle();

        if (gameData) {
          setGame(gameData);
        } else {
          const { data: byType } = await supabase
            .from("games")
            .select("*")
            .eq("type", gameId as any)
            .maybeSingle();

          if (byType) setGame(byType);
        }

        // 4. If Truth game, load non-intimacy prompts from talk_decks & talk_prompts
        const { data: nonIntimacyDecks } = await supabase
          .from("talk_decks")
          .select("id")
          .eq("is_intimacy", false);

        if (nonIntimacyDecks && nonIntimacyDecks.length > 0) {
          const deckIds = nonIntimacyDecks.map((d) => d.id);
          const { data: promptsList } = await supabase
            .from("talk_prompts")
            .select("prompt_text")
            .in("deck_id", deckIds);

          if (promptsList && promptsList.length > 0) {
            // Shuffle non-intimacy prompts
            const shuffled = promptsList
              .map((p) => p.prompt_text)
              .sort(() => Math.random() - 0.5);
            setTruthPrompts(shuffled);
          } else {
            setTruthPrompts(TRUTH_FALLBACK_PROMPTS);
          }
        } else {
          setTruthPrompts(TRUTH_FALLBACK_PROMPTS);
        }
      } catch (err) {
        console.error("Failed to load game data:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [gameId]);

  // Load existing game play for this couple & game
  React.useEffect(() => {
    if (!coupleId || !game?.id) return;

    async function loadActivePlay() {
      const { data } = await supabase
        .from("game_plays")
        .select("*")
        .eq("couple_id", coupleId)
        .eq("game_id", game.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data && data.data) {
        setCurrentGamePlayId(data.id);
        const playData = data.data as any;

        if (game.type === "thisorthat" || game.type === "wyr") {
          if (typeof playData.round_index === "number") {
            setRoundIndex(playData.round_index);
          }
          if (playData.choices) {
            const choices = playData.choices;
            if (currentUserId && choices[currentUserId]) {
              setMyChoice(choices[currentUserId]);
            }
            if (partnerId && choices[partnerId]) {
              setPartnerChoice(choices[partnerId]);
            } else {
              const otherKey = Object.keys(choices).find((k) => k !== currentUserId);
              if (otherKey && choices[otherKey]) {
                setPartnerChoice(choices[otherKey]);
              }
            }
          }
        } else if (game.type === "truth") {
          if (typeof playData.truth_index === "number") {
            setCurrentTruthIndex(playData.truth_index);
          }
          if (playData.is_done) setIsTruthDone(true);
        } else if (game.type === "dare") {
          if (typeof playData.dare_index === "number") {
            setCurrentDareIndex(playData.dare_index);
          }
          if (playData.is_done) setIsDareDone(true);
        }
      }
    }

    loadActivePlay();
  }, [coupleId, game?.id, currentUserId, partnerId]);

  // Realtime subscription + Broadcast for sub-100ms sync between partners
  React.useEffect(() => {
    if (!coupleId || !game?.id) return;

    const channelName = `game_sync_${coupleId}_${game.id}`;
    const channel = supabase
      .channel(channelName, {
        config: { broadcast: { self: false } },
      })
      .on("broadcast", { event: "choice_pick" }, (payload) => {
        const data = payload.payload;
        if (!data) return;
        if (typeof data.round_index === "number" && data.round_index !== roundIndex) {
          setRoundIndex(data.round_index);
        }
        if (data.user_id && data.user_id !== currentUserId && data.choice) {
          setPartnerChoice(data.choice);
        }
      })
      .on("broadcast", { event: "next_question" }, (payload) => {
        const data = payload.payload;
        if (typeof data?.round_index === "number") {
          setRoundIndex(data.round_index);
          setMyChoice(null);
          setPartnerChoice(null);
          setSavedToSpace(false);
        }
      })
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "game_plays",
          filter: `couple_id=eq.${coupleId}`,
        },
        (payload) => {
          const row = (payload.new || payload.old) as any;
          if (!row || row.game_id !== game.id) return;

          setCurrentGamePlayId(row.id);
          const playData = row.data as any;

          if (game.type === "thisorthat" || game.type === "wyr") {
            if (typeof playData?.round_index === "number") {
              setRoundIndex(playData.round_index);
            }
            if (playData?.choices) {
              const choices = playData.choices;
              if (currentUserId && choices[currentUserId]) {
                setMyChoice(choices[currentUserId]);
              }
              if (partnerId && choices[partnerId]) {
                setPartnerChoice(choices[partnerId]);
              } else {
                const otherKey = Object.keys(choices).find((k) => k !== currentUserId);
                if (otherKey && choices[otherKey]) {
                  setPartnerChoice(choices[otherKey]);
                }
              }
            }
            if (playData?.saved_to_space) setSavedToSpace(true);
          } else if (game.type === "truth") {
            if (typeof playData?.truth_index === "number") {
              setCurrentTruthIndex(playData.truth_index);
            }
            if (playData?.is_done) setIsTruthDone(true);
            if (playData?.saved_to_space) setSavedToSpace(true);
          } else if (game.type === "dare") {
            if (typeof playData?.dare_index === "number") {
              setCurrentDareIndex(playData.dare_index);
            }
            if (playData?.is_done) setIsDareDone(true);
            if (playData?.saved_to_space) setSavedToSpace(true);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [coupleId, game?.id, currentUserId, partnerId, roundIndex]);

  // High-speed polling fallback while waiting for partner to pick
  React.useEffect(() => {
    if (!coupleId || !game?.id || myChoice === null || partnerChoice !== null) return;

    let isMounted = true;
    const interval = setInterval(async () => {
      try {
        const { data } = await supabase
          .from("game_plays")
          .select("id, data")
          .eq("couple_id", coupleId)
          .eq("game_id", game.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (data && isMounted) {
          const playData = data.data as any;
          if (playData?.round_index === roundIndex && playData?.choices) {
            const choices = playData.choices;
            if (partnerId && choices[partnerId]) {
              setPartnerChoice(choices[partnerId]);
            } else {
              const otherKey = Object.keys(choices).find((k) => k !== currentUserId);
              if (otherKey && choices[otherKey]) {
                setPartnerChoice(choices[otherKey]);
              }
            }
          }
        }
      } catch (err) {
        // silent fallback
      }
    }, 1000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [coupleId, game?.id, myChoice, partnerChoice, roundIndex, partnerId, currentUserId]);

  // Dares pool filtered for stage
  const eligibleDares = React.useMemo(() => {
    return DARE_KINGDOM_PROMPTS.filter((d) => {
      if (d.marriedOnly && userStage !== "married") return false;
      return true;
    });
  }, [userStage]);

  // Handle choice submission for This or That / WYR
  const handleSelectChoice = async (choice: "a" | "b") => {
    let resolvedUid = currentUserId;
    let resolvedCoupleId = coupleId;

    if (!resolvedUid) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      resolvedUid =
        user?.id ||
        (typeof window !== "undefined" ? localStorage.getItem("user_id") || "" : "");
      if (resolvedUid) setCurrentUserId(resolvedUid);
    }

    if (!resolvedCoupleId && resolvedUid) {
      const { data: coupleList } = await supabase
        .from("couples")
        .select("id, status")
        .or(`partner_a.eq.${resolvedUid},partner_b.eq.${resolvedUid}`)
        .order("created_at", { ascending: false });
      const foundCouple =
        coupleList?.find((c) => c.status === "paired") || coupleList?.[0];
      if (foundCouple) {
        resolvedCoupleId = foundCouple.id;
        setCoupleId(foundCouple.id);
      } else if (typeof window !== "undefined") {
        resolvedCoupleId = localStorage.getItem("couple_id") || "";
      }
    }

    if (!resolvedCoupleId || !game?.id || !resolvedUid || isSubmitting) return;

    if (!isPremium) {
      const access = await checkAccess(resolvedCoupleId, "games");
      if (!access.allowed) {
        setIsPaywallOpen(true);
        return;
      }
    }

    setIsSubmitting(true);
    setMyChoice(choice);

    // 1. Broadcast instant pick to partner over realtime channel
    const channelName = `game_sync_${resolvedCoupleId}_${game.id}`;
    supabase
      .channel(channelName)
      .send({
        type: "broadcast",
        event: "choice_pick",
        payload: {
          user_id: resolvedUid,
          choice,
          round_index: roundIndex,
        },
      })
      .catch(() => {});

    try {
      const promptsList =
        game.type === "wyr" ? WOULD_YOU_RATHER_PROMPTS : THIS_OR_THAT_PROMPTS;
      const currentPrompt = promptsList[roundIndex % promptsList.length];

      // 2. Fetch latest row to merge atomically without wiping partner's pick
      const { data: latestRows } = await supabase
        .from("game_plays")
        .select("*")
        .eq("couple_id", resolvedCoupleId)
        .eq("game_id", game.id)
        .order("created_at", { ascending: false })
        .limit(1);

      const existingRow = latestRows && latestRows.length > 0 ? latestRows[0] : null;
      const existingData = (existingRow?.data as any) || {};
      const isSameRound = existingData.round_index === roundIndex;
      const existingChoices = isSameRound ? (existingData.choices || {}) : {};

      // Merge choices safely
      const mergedChoices = {
        ...existingChoices,
        [resolvedUid]: choice,
      };

      // If partner's choice is already in database, update local state immediately
      if (partnerId && existingChoices[partnerId]) {
        setPartnerChoice(existingChoices[partnerId]);
      } else {
        const otherKey = Object.keys(existingChoices).find((k) => k !== resolvedUid);
        if (otherKey && existingChoices[otherKey]) {
          setPartnerChoice(existingChoices[otherKey]);
        }
      }

      const playPayload = {
        ...existingData,
        round_index: roundIndex,
        prompt_id: currentPrompt.id,
        question: { a: currentPrompt.a, b: currentPrompt.b },
        choices: mergedChoices,
      };

      if (existingRow) {
        await supabase
          .from("game_plays")
          .update({ data: playPayload })
          .eq("id", existingRow.id);
        setCurrentGamePlayId(existingRow.id);
      } else {
        const { data: inserted } = await supabase
          .from("game_plays")
          .insert({
            couple_id: resolvedCoupleId,
            game_id: game.id,
            data: playPayload,
          })
          .select()
          .single();

        if (inserted) setCurrentGamePlayId(inserted.id);
      }

      // Record couple activity for streak & connection
      recordCoupleActivity(resolvedCoupleId).catch((err) =>
        console.error("Streak error:", err)
      );
    } catch (err) {
      console.error("Failed to save choice:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Next round for choice games
  const handleNextChoiceQuestion = async () => {
    const promptsList =
      game.type === "wyr" ? WOULD_YOU_RATHER_PROMPTS : THIS_OR_THAT_PROMPTS;
    const nextIdx = (roundIndex + 1) % promptsList.length;
    setRoundIndex(nextIdx);
    setMyChoice(null);
    setPartnerChoice(null);
    setSavedToSpace(false);

    if (!coupleId || !game?.id) return;

    // Send broadcast to partner for instant advance
    const channelName = `game_sync_${coupleId}_${game.id}`;
    supabase
      .channel(channelName)
      .send({
        type: "broadcast",
        event: "next_question",
        payload: { round_index: nextIdx },
      })
      .catch(() => {});

    try {
      const playPayload = {
        round_index: nextIdx,
        prompt_id: promptsList[nextIdx].id,
        question: { a: promptsList[nextIdx].a, b: promptsList[nextIdx].b },
        choices: {},
      };

      if (currentGamePlayId) {
        await supabase
          .from("game_plays")
          .update({ data: playPayload })
          .eq("id", currentGamePlayId);
      }
    } catch (err) {
      console.error("Failed to advance question:", err);
    }
  };

  // Truth Actions
  const activeTruthPrompt =
    truthPrompts.length > 0
      ? truthPrompts[currentTruthIndex % truthPrompts.length]
      : TRUTH_FALLBACK_PROMPTS[0];

  const handleTruthDone = async () => {
    setIsTruthDone(true);
    if (!coupleId || !game?.id) return;
    try {
      const playPayload = {
        truth_index: currentTruthIndex,
        prompt: activeTruthPrompt,
        is_done: true,
      };
      if (currentGamePlayId) {
        await supabase.from("game_plays").update({ data: playPayload }).eq("id", currentGamePlayId);
      } else {
        const { data } = await supabase.from("game_plays").insert({ couple_id: coupleId, game_id: game.id, data: playPayload }).select().single();
        if (data) setCurrentGamePlayId(data.id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleTruthSkip = async () => {
    const nextIdx = (currentTruthIndex + 1) % (truthPrompts.length || 1);
    setCurrentTruthIndex(nextIdx);
    setIsTruthDone(false);
    setSavedToSpace(false);

    if (!coupleId || !game?.id) return;
    try {
      const playPayload = {
        truth_index: nextIdx,
        prompt: truthPrompts[nextIdx] || TRUTH_FALLBACK_PROMPTS[0],
        is_done: false,
      };
      if (currentGamePlayId) {
        await supabase.from("game_plays").update({ data: playPayload }).eq("id", currentGamePlayId);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Dare Actions
  const activeDare =
    eligibleDares.length > 0
      ? eligibleDares[currentDareIndex % eligibleDares.length]
      : DARE_KINGDOM_PROMPTS[0];

  const handleDareDone = async () => {
    setIsDareDone(true);
    if (!coupleId || !game?.id) return;
    try {
      const playPayload = {
        dare_index: currentDareIndex,
        dare: activeDare.text,
        is_done: true,
      };
      if (currentGamePlayId) {
        await supabase.from("game_plays").update({ data: playPayload }).eq("id", currentGamePlayId);
      } else {
        const { data } = await supabase.from("game_plays").insert({ couple_id: coupleId, game_id: game.id, data: playPayload }).select().single();
        if (data) setCurrentGamePlayId(data.id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDareSkip = async () => {
    const nextIdx = (currentDareIndex + 1) % eligibleDares.length;
    setCurrentDareIndex(nextIdx);
    setIsDareDone(false);
    setSavedToSpace(false);

    if (!coupleId || !game?.id) return;
    try {
      const playPayload = {
        dare_index: nextIdx,
        dare: eligibleDares[nextIdx].text,
        is_done: false,
      };
      if (currentGamePlayId) {
        await supabase.from("game_plays").update({ data: playPayload }).eq("id", currentGamePlayId);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Save to Space for all games
  const handleSaveToSpace = async () => {
    if (!coupleId || !currentUserId || savedToSpace) return;

    try {
      let contentPayload: any = {};

      if (game.type === "thisorthat" || game.type === "wyr") {
        const promptsList = game.type === "wyr" ? WOULD_YOU_RATHER_PROMPTS : THIS_OR_THAT_PROMPTS;
        const currentPrompt = promptsList[roundIndex % promptsList.length];
        const myPickText = myChoice === "a" ? currentPrompt.a : currentPrompt.b;
        const partnerPickText = partnerChoice === "a" ? currentPrompt.a : currentPrompt.b;

        contentPayload = {
          game_title: game.title,
          question: `${currentPrompt.a} vs ${currentPrompt.b}`,
          partner_a: currentUserName,
          pick_a: myPickText,
          partner_b: partnerName,
          pick_b: partnerPickText,
          is_match: myChoice === partnerChoice,
        };
      } else if (game.type === "truth") {
        contentPayload = {
          game_title: "Kingdom Truth",
          question: activeTruthPrompt,
          partner_a: currentUserName,
          pick_a: "Answered honestly in love",
          partner_b: partnerName,
          pick_b: "Listened with grace",
          is_match: true,
        };
      } else if (game.type === "dare") {
        contentPayload = {
          game_title: "Kingdom Dare",
          question: activeDare.text,
          partner_a: currentUserName,
          pick_a: "Dare Completed! 🏆",
          partner_b: partnerName,
          pick_b: "Encouraged and cheered",
          is_match: true,
        };
      }

      await supabase.from("moments").insert({
        couple_id: coupleId,
        author_id: currentUserId,
        type: "game",
        content: JSON.stringify(contentPayload),
      });

      setSavedToSpace(true);
    } catch (err) {
      console.error("Failed to save moment:", err);
    }
  };

  const iconSrc = game?.type ? GAME_ICONS[game.type] : "/icons/games/thisorthat.svg";

  if (loading) {
    return (
      <div className="py-20 text-center text-xs text-inkSoft">
        Loading game...
      </div>
    );
  }

  // RENDER FOR HOW WELL DO YOU KNOW ME (QUIZ)
  if (game?.type === "quiz") {
    return (
      <QuizGame
        game={game}
        coupleId={coupleId}
        currentUserId={currentUserId}
        currentUserName={currentUserName}
        partnerId={partnerId}
        partnerName={partnerName}
      />
    );
  }

  // RENDER FOR BIBLE TRIVIA FOR TWO
  if (game?.type === "trivia") {
    return (
      <BibleTriviaGame
        game={game}
        coupleId={coupleId}
        currentUserId={currentUserId}
        currentUserName={currentUserName}
        partnerId={partnerId}
        partnerName={partnerName}
      />
    );
  }

  // RENDER FOR DRAWING BATTLE
  if (game?.type === "draw") {
    return (
      <DrawingBattleGame
        game={game}
        coupleId={coupleId}
        currentUserId={currentUserId}
        currentUserName={currentUserName}
        partnerId={partnerId}
        partnerName={partnerName}
      />
    );
  }

  // RENDER FOR PHOTO CHALLENGE
  if (game?.type === "photo") {
    return (
      <PhotoChallengeGame
        game={game}
        coupleId={coupleId}
        currentUserId={currentUserId}
        currentUserName={currentUserName}
        partnerId={partnerId}
        partnerName={partnerName}
      />
    );
  }

  // RENDER FOR TRUTH
  if (game?.type === "truth") {
    return (
      <div className="space-y-6 pb-28">
        <Link
          href="/games"
          className="inline-flex items-center space-x-1.5 text-xs text-inkSoft hover:text-ink transition-colors"
        >
          <ArrowLeft size={16} strokeWidth={1.5} />
          <span>All Games</span>
        </Link>

        <Card className="rounded-[24px] bg-white border border-border p-6 shadow-[0_8px_32px_rgba(255,90,126,0.08)] space-y-6 text-center">
          <div className="flex flex-col items-center space-y-2">
            <div className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center shadow-xs">
              <Image src={iconSrc} alt="Truth" width={48} height={48} className="w-12 h-12 object-contain" />
            </div>
            <Pill>Kingdom Truth</Pill>
          </div>

          <div className="py-2">
            <h2 className="font-heading text-xl sm:text-2xl text-ink font-normal leading-relaxed">
              &ldquo;{activeTruthPrompt}&rdquo;
            </h2>
          </div>

          <div className="space-y-2 pt-2">
            <button
              type="button"
              onClick={handleTruthDone}
              className={cn(
                "w-full h-12 rounded-full font-medium text-sm transition-all flex items-center justify-center space-x-2 shadow-xs active:scale-[0.99]",
                isTruthDone
                  ? "bg-[#DDF2E6] text-[#2C6E49] border border-[#BCE7CE]"
                  : "bg-primary hover:bg-deep text-white"
              )}
            >
              {isTruthDone ? (
                <>
                  <Check size={16} strokeWidth={1.5} />
                  <span>Done</span>
                </>
              ) : (
                <span>Done</span>
              )}
            </button>

            {isTruthDone && (
              <button
                type="button"
                onClick={handleSaveToSpace}
                disabled={savedToSpace}
                className={cn(
                  "w-full h-11 rounded-full font-medium text-xs transition-all flex items-center justify-center space-x-2 border",
                  savedToSpace
                    ? "bg-[#DDF2E6] text-[#2C6E49] border-[#BCE7CE]"
                    : "bg-white hover:bg-canvas text-ink border-border"
                )}
              >
                {savedToSpace ? <span>Saved to Space ✓</span> : <span>Save to Space</span>}
              </button>
            )}

            {/* Always show Skip button */}
            <button
              type="button"
              onClick={handleTruthSkip}
              className="inline-flex items-center space-x-1.5 text-xs text-inkSoft hover:text-ink transition-colors py-2"
            >
              <RefreshCw size={13} strokeWidth={1.5} />
              <span>Skip prompt</span>
            </button>
          </div>
        </Card>
      </div>
    );
  }

  // RENDER FOR DARE KINGDOM
  if (game?.type === "dare") {
    return (
      <div className="space-y-6 pb-28">
        <Link
          href="/games"
          className="inline-flex items-center space-x-1.5 text-xs text-inkSoft hover:text-ink transition-colors"
        >
          <ArrowLeft size={16} strokeWidth={1.5} />
          <span>All Games</span>
        </Link>

        <Card className="rounded-[24px] bg-white border border-border p-6 shadow-[0_8px_32px_rgba(255,90,126,0.08)] space-y-6 text-center">
          <div className="flex flex-col items-center space-y-2">
            <div className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center shadow-xs">
              <Image src={iconSrc} alt="Dare" width={48} height={48} className="w-12 h-12 object-contain" />
            </div>
            <Pill>Dare Kingdom • {activeDare.category}</Pill>
          </div>

          <div className="py-2">
            <h2 className="font-heading text-xl sm:text-2xl text-ink font-normal leading-relaxed">
              &ldquo;{activeDare.text}&rdquo;
            </h2>
          </div>

          <div className="space-y-2 pt-2">
            <button
              type="button"
              onClick={handleDareDone}
              className={cn(
                "w-full h-12 rounded-full font-medium text-sm transition-all flex items-center justify-center space-x-2 shadow-xs active:scale-[0.99]",
                isDareDone
                  ? "bg-[#DDF2E6] text-[#2C6E49] border border-[#BCE7CE]"
                  : "bg-primary hover:bg-deep text-white"
              )}
            >
              {isDareDone ? (
                <>
                  <Check size={16} strokeWidth={1.5} />
                  <span>Done</span>
                </>
              ) : (
                <span>Done</span>
              )}
            </button>

            {isDareDone && (
              <button
                type="button"
                onClick={handleSaveToSpace}
                disabled={savedToSpace}
                className={cn(
                  "w-full h-11 rounded-full font-medium text-xs transition-all flex items-center justify-center space-x-2 border",
                  savedToSpace
                    ? "bg-[#DDF2E6] text-[#2C6E49] border-[#BCE7CE]"
                    : "bg-white hover:bg-canvas text-ink border-border"
                )}
              >
                {savedToSpace ? <span>Saved to Space ✓</span> : <span>Save to Space</span>}
              </button>
            )}

            {/* Always show Skip button */}
            <button
              type="button"
              onClick={handleDareSkip}
              className="inline-flex items-center space-x-1.5 text-xs text-inkSoft hover:text-ink transition-colors py-2"
            >
              <RefreshCw size={13} strokeWidth={1.5} />
              <span>Skip dare</span>
            </button>
          </div>
        </Card>
      </div>
    );
  }

  // RENDER FOR THIS OR THAT & WOULD YOU RATHER KINGDOM
  const isWYR = game?.type === "wyr";
  const promptsList = isWYR ? WOULD_YOU_RATHER_PROMPTS : THIS_OR_THAT_PROMPTS;
  const currentPrompt = promptsList[roundIndex % promptsList.length];
  const isBothPicked = myChoice !== null && partnerChoice !== null;
  const isMatch = isBothPicked && myChoice === partnerChoice;
  const progressPercent = ((roundIndex + 1) / promptsList.length) * 100;

  return (
    <div className="space-y-6 pb-28">
      {/* Top Header & Navigation */}
      <div className="space-y-3">
        <Link
          href="/games"
          className="inline-flex items-center space-x-1.5 text-xs text-inkSoft hover:text-ink transition-colors"
        >
          <ArrowLeft size={16} strokeWidth={1.5} />
          <span>All Games</span>
        </Link>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center">
              <Image
                src={iconSrc}
                alt={game?.title || "Game"}
                width={32}
                height={32}
                className="w-8 h-8 object-contain"
              />
            </div>
            <h1 className="font-heading text-2xl text-ink font-normal">
              {game?.title || "Couple Game"}
            </h1>
          </div>
          <span className="text-xs text-inkSoft font-medium">
            {roundIndex + 1} of {promptsList.length}
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-full h-1 bg-border rounded-full overflow-hidden">
          <div
            className="h-1 rounded-full bg-primary transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Main Game Card: white 24px radius, question top "Pick one" */}
      <Card className="rounded-[24px] bg-white border border-border p-6 shadow-[0_8px_32px_rgba(255,90,126,0.08)] space-y-6">
        <div className="text-center space-y-1">
          <Pill className="text-[10px] py-0.5 px-2.5">
            {isWYR ? "Kingdom Dilemma" : "Instant Choice"}
          </Pill>
          <h2 className="font-heading text-2xl sm:text-3xl text-ink font-normal pt-1">
            Pick one
          </h2>
        </div>

        {/* 2 Large Buttons Side by Side (Rose / Blush) */}
        <div className="grid grid-cols-2 gap-3.5">
          {/* Button A */}
          <button
            type="button"
            disabled={isSubmitting || isBothPicked}
            onClick={() => handleSelectChoice("a")}
            className={cn(
              "p-5 rounded-[20px] text-center min-h-[120px] flex flex-col items-center justify-center font-medium text-sm sm:text-base border transition-all active:scale-[0.98] select-none",
              myChoice === "a"
                ? "bg-primary text-white border-primary shadow-[0_8px_32px_rgba(255,90,126,0.2)] scale-[1.02]"
                : "bg-white hover:bg-blush/20 border-border text-ink"
            )}
          >
            <span className="text-xs text-inkSoft uppercase tracking-wider block mb-1 opacity-70">
              Option A
            </span>
            <span className="leading-snug">{currentPrompt.a}</span>
          </button>

          {/* Button B */}
          <button
            type="button"
            disabled={isSubmitting || isBothPicked}
            onClick={() => handleSelectChoice("b")}
            className={cn(
              "p-5 rounded-[20px] text-center min-h-[120px] flex flex-col items-center justify-center font-medium text-sm sm:text-base border transition-all active:scale-[0.98] select-none",
              myChoice === "b"
                ? "bg-primary text-white border-primary shadow-[0_8px_32px_rgba(255,90,126,0.2)] scale-[1.02]"
                : "bg-white hover:bg-blush/20 border-border text-ink"
            )}
          >
            <span className="text-xs text-inkSoft uppercase tracking-wider block mb-1 opacity-70">
              Option B
            </span>
            <span className="leading-snug">{currentPrompt.b}</span>
          </button>
        </div>

        {/* Status or Reveal Section */}
        <AnimatePresence mode="wait">
          {isBothPicked ? (
            /* REVEAL STATE */
            <motion.div
              key="reveal"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4 pt-2"
            >
              {/* Reveal Headline: Match or You picked different - talk about it! */}
              <div
                className={cn(
                  "p-4 rounded-[20px] border text-center space-y-1.5",
                  isMatch
                    ? "bg-[#DDF2E6] border-[#BCE7CE] text-[#2C6E49]"
                    : "bg-[#FFC2CE]/35 border-primary/20 text-ink"
                )}
              >
                <div className="flex items-center justify-center space-x-1.5 font-heading text-xl">
                  {isMatch ? (
                    <>
                      <Heart size={18} strokeWidth={1.5} className="fill-current text-[#2C6E49]" />
                      <span>It&apos;s a Match! 🎉</span>
                    </>
                  ) : (
                    <span>You picked different - talk about it!</span>
                  )}
                </div>

                <p className="text-xs text-inkSoft font-body">
                  {isMatch
                    ? `You both chose: "${myChoice === "a" ? currentPrompt.a : currentPrompt.b}"`
                    : "Embrace the beauty of how God made you each unique."}
                </p>
              </div>

              {/* Both Picks side by side breakdown */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-[16px] bg-canvas border border-border text-center space-y-1">
                  <span className="text-[10px] text-primary font-semibold uppercase tracking-wider block">
                    You Chose
                  </span>
                  <p className="font-medium text-ink">
                    {myChoice === "a" ? currentPrompt.a : currentPrompt.b}
                  </p>
                </div>

                <div className="p-3 rounded-[16px] bg-blush/20 border border-blush/40 text-center space-y-1">
                  <span className="text-[10px] text-deep font-semibold uppercase tracking-wider block">
                    {partnerName} Chose
                  </span>
                  <p className="font-medium text-ink">
                    {partnerChoice === "a" ? currentPrompt.a : currentPrompt.b}
                  </p>
                </div>
              </div>

              {/* Action Buttons: Button Save to Space & Next Question */}
              <div className="pt-2 space-y-2">
                <button
                  type="button"
                  onClick={handleSaveToSpace}
                  disabled={savedToSpace}
                  className={cn(
                    "w-full h-12 rounded-full font-medium text-sm transition-all flex items-center justify-center space-x-2 shadow-xs active:scale-[0.99]",
                    savedToSpace
                      ? "bg-[#DDF2E6] text-[#2C6E49] border border-[#BCE7CE]"
                      : "bg-white hover:bg-canvas text-ink border border-border"
                  )}
                >
                  {savedToSpace ? (
                    <>
                      <Check size={16} strokeWidth={1.5} />
                      <span>Saved to Space</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} strokeWidth={1.5} className="text-primary" />
                      <span>Save to Space</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleNextChoiceQuestion}
                  className="w-full h-12 rounded-full bg-primary hover:bg-deep text-white font-medium text-sm transition-all shadow-[0_8px_32px_rgba(255,90,126,0.15)] active:scale-[0.99]"
                >
                  Next Question &rarr;
                </button>
              </div>
            </motion.div>
          ) : (
            /* WAITING STATE */
            <motion.div
              key="waiting"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-2 space-y-1"
            >
              {myChoice !== null ? (
                <div className="flex items-center justify-center space-x-2 text-xs text-primary font-medium animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-primary" />
                  <span>
                    You picked! Waiting for {partnerName} to pick...
                  </span>
                </div>
              ) : partnerChoice !== null ? (
                <div className="flex items-center justify-center space-x-2 text-xs text-deep font-medium">
                  <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  <span>{partnerName} has locked in their choice! Your turn.</span>
                </div>
              ) : (
                <p className="text-xs text-inkSoft">
                  Tap your pick to lock in your choice.
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      {/* Monetization Paywall Modal */}
      <Paywall
        isOpen={isPaywallOpen}
        onClose={() => setIsPaywallOpen(false)}
        coupleId={coupleId}
        currentUserId={currentUserId}
        reason="game_limit"
        onUpgraded={() => setIsPremium(true)}
      />
    </div>
  );
}

export default function GameDetailPage() {
  return (
    <React.Suspense
      fallback={
        <div className="py-12 text-center text-xs text-inkSoft">
          Loading game...
        </div>
      }
    >
      <GameDetailContent />
    </React.Suspense>
  );
}
