"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Pill } from "@/components/ui/pill";
import { supabase } from "@/lib/supabase/client";
import { Paywall } from "@/components/paywall";
import { checkAccess, getCoupleSubscription } from "@/lib/subscription";
import { SkeletonList, SkeletonCard } from "@/components/ui/skeleton-card";
import { ErrorState } from "@/components/ui/error-state";
import { EmptyState } from "@/components/ui/empty-state";

interface GameItem {
  id: string;
  title: string;
  type: string;
  description: string | null;
}

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

function GamesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [games, setGames] = React.useState<GameItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [coupleId, setCoupleId] = React.useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = React.useState<string | null>(null);
  const [isPaywallOpen, setIsPaywallOpen] = React.useState(false);
  const [isPremium, setIsPremium] = React.useState(false);

  const paywallParam = searchParams.get("paywall");

  React.useEffect(() => {
    if (paywallParam === "game_limit") {
      setIsPaywallOpen(true);
    }
  }, [paywallParam]);

  const loadGamesAndUser = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;
      if (user) {
        setCurrentUserId(user.id);
        const { data: couple } = await supabase
          .from("couples")
          .select("id")
          .or(`partner_a.eq.${user.id},partner_b.eq.${user.id}`)
          .maybeSingle();

        if (couple) {
          setCoupleId(couple.id);
          const sub = await getCoupleSubscription(couple.id);
          setIsPremium(sub.isPremium);
        }
      }

      const { data, error: gamesErr } = await supabase
        .from("games")
        .select("*")
        .order("id");

      if (gamesErr) throw gamesErr;

      if (data && data.length > 0) {
        setGames(data);
      } else {
        // Static fallback of the 8 seeded games
        setGames([
          { id: "e1000000-0000-0000-0000-000000000001", title: "This or That", type: "thisorthat", description: "Quick choices to discover each other's preferences." },
          { id: "e1000000-0000-0000-0000-000000000002", title: "Would You Rather Kingdom", type: "wyr", description: "Faith-filled and playful dilemmas for two." },
          { id: "e1000000-0000-0000-0000-000000000003", title: "Truth", type: "truth", description: "Honest, heart-opening questions to build trust." },
          { id: "e1000000-0000-0000-0000-000000000004", title: "Dare Kingdom", type: "dare", description: "Fun, wholesome, Christ-honoring romantic challenges." },
          { id: "e1000000-0000-0000-0000-000000000005", title: "How Well Do You Know Me", type: "quiz", description: "Test your knowledge of your partner's world." },
          { id: "e1000000-0000-0000-0000-000000000006", title: "Drawing Battle", type: "draw", description: "Playful creative sketch challenges for two." },
          { id: "e1000000-0000-0000-0000-000000000007", title: "Photo Challenge", type: "photo", description: "Snap sweet moments and shared memories together." },
          { id: "e1000000-0000-0000-0000-000000000008", title: "Bible Trivia for Two", type: "trivia", description: "Inspiring scripture questions for kingdom couples." },
        ]);
      }
    } catch (err) {
      console.error("Failed to load games:", err);
      setError("Something soft broke. Try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadGamesAndUser();
  }, [loadGamesAndUser]);

  const handleGameClick = async (e: React.MouseEvent, gameId: string) => {
    e.preventDefault();
    if (!isPremium && coupleId) {
      const access = await checkAccess(coupleId, "games");
      if (!access.allowed) {
        setIsPaywallOpen(true);
        return;
      }
    }
    router.push(`/games/${gameId}`);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className="space-y-6 pb-20"
    >
      {/* Header */}
      <header className="space-y-1">
        <Pill>Couple Games</Pill>
        <h1 className="font-heading text-3xl text-ink font-normal pt-1">
          Games for Two
        </h1>
        <p className="text-sm text-inkSoft">
          Playful challenges to laugh and grow closer.
        </p>
      </header>

      {/* Loading state: 3 skeleton cards bg #F5E6E8 animate-pulse height 80px radius 24px */}
      {loading ? (
        <SkeletonList count={3} />
      ) : error ? (
        <ErrorState onRetry={loadGamesAndUser} />
      ) : games.length === 0 ? (
        <EmptyState
          headline="No games available"
          subtext="Your games will appear here shortly."
          actionLabel="Refresh Games"
          onAction={loadGamesAndUser}
        />
      ) : (
        /* Grid: 2 columns, gap 16px with stagger 0.05s */
        <motion.div
          variants={{
            hidden: { opacity: 0 },
            visible: {
              opacity: 1,
              transition: { staggerChildren: 0.05 },
            },
          }}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-2 gap-4"
        >
          {games.map((game) => {
            const iconSrc = GAME_ICONS[game.type] || "/icons/games/thisorthat.svg";

            return (
              <motion.div
                key={game.id}
                variants={{
                  hidden: { opacity: 0, y: 10 },
                  visible: { opacity: 1, y: 0 },
                }}
                whileTap={{ scale: 0.98 }}
                onClick={(e) => handleGameClick(e, game.id)}
                className="bg-white rounded-[24px] border border-border p-4 shadow-[0_8px_32px_rgba(255,90,126,0.08)] flex flex-col justify-between min-h-[170px] hover:border-primary/50 transition-all select-none cursor-pointer"
              >
                {/* Top: 48px icon on blush circle */}
                <div className="mb-4">
                  <div className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center shadow-xs">
                    <Image
                      src={iconSrc}
                      alt={game.title}
                      width={48}
                      height={48}
                      className="w-12 h-12 object-contain"
                    />
                  </div>
                </div>

                {/* Bottom: Title 16px serif */}
                <div className="space-y-1">
                  <h2 className="font-heading text-[16px] text-ink leading-snug line-clamp-2">
                    {game.title}
                  </h2>
                  <p className="text-[12px] text-inkSoft line-clamp-1">
                    Play Together &rarr;
                  </p>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {/* Paywall Modal */}
      <Paywall
        isOpen={isPaywallOpen}
        onClose={() => setIsPaywallOpen(false)}
        coupleId={coupleId}
        currentUserId={currentUserId}
        reason="game_limit"
        onUpgraded={() => setIsPremium(true)}
      />
    </motion.div>
  );
}

export default function GamesPage() {
  return (
    <React.Suspense
      fallback={
        <div className="py-12 text-center text-xs text-inkSoft">
          Loading games...
        </div>
      }
    >
      <GamesContent />
    </React.Suspense>
  );
}
