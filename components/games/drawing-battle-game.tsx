"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Sparkles,
  Check,
  Eraser,
  PenTool,
  RotateCcw,
  Clock,
  Heart,
  ShieldCheck,
  Shuffle,
} from "lucide-react";
import { Pill } from "@/components/ui/pill";
import { Card } from "@/components/ui/card";
import { supabase } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface DrawingBattleGameProps {
  game: any;
  coupleId: string;
  currentUserId: string;
  currentUserName: string;
  partnerId: string;
  partnerName: string;
}

const DRAWING_PROMPTS = [
  {
    title: "Draw our dream kitchen",
    icon: "/icons/games/prompts/kitchen.svg",
    description: "Where we brew coffee, bake, and talk about our day.",
  },
  {
    title: "Draw our future home",
    icon: "/icons/games/prompts/house.svg",
    description: "A peaceful sanctuary filled with prayer and laughter.",
  },
  {
    title: "Draw our future together",
    icon: "/icons/games/prompts/future.svg",
    description: "Sunrises, journeys, and kingdom dreams hand in hand.",
  },
];

export function DrawingBattleGame({
  game,
  coupleId,
  currentUserId,
  currentUserName,
  partnerId,
  partnerName,
}: DrawingBattleGameProps) {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);

  const [promptIndex, setPromptIndex] = React.useState<number>(0);
  const activePrompt = DRAWING_PROMPTS[promptIndex];

  // Tool: "pen" | "eraser"
  const [tool, setTool] = React.useState<"pen" | "eraser">("pen");
  const [isDrawing, setIsDrawing] = React.useState<boolean>(false);
  const [lastPos, setLastPos] = React.useState<{ x: number; y: number } | null>(null);

  // Timer 60s optional
  const [timerActive, setTimerActive] = React.useState<boolean>(false);
  const [timeLeft, setTimeLeft] = React.useState<number>(60);

  // Submitted drawings
  const [myDrawing, setMyDrawing] = React.useState<string | null>(null);
  const [partnerDrawing, setPartnerDrawing] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState<boolean>(false);
  const [savedToSpace, setSavedToSpace] = React.useState<boolean>(false);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [activePlayId, setActivePlayId] = React.useState<string | null>(null);

  // Initialize canvas with solid white background
  const initCanvas = React.useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, 300, 300);
  }, []);

  React.useEffect(() => {
    initCanvas();
  }, [initCanvas]);

  // Load existing drawings from game_plays
  const loadDrawingData = React.useCallback(async () => {
    if (!coupleId || !game?.id) return;
    try {
      const { data } = await supabase
        .from("game_plays")
        .select("*")
        .eq("couple_id", coupleId)
        .eq("game_id", game.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) {
        setActivePlayId(data.id);
        const playData = (data.data as any) || {};
        const drawings = playData.drawings || {};

        if (playData.prompt) {
          const pIdx = DRAWING_PROMPTS.findIndex((p) => p.title === playData.prompt);
          if (pIdx !== -1) setPromptIndex(pIdx);
        }

        if (currentUserId && drawings[currentUserId]?.image_url) {
          setMyDrawing(drawings[currentUserId].image_url);
        }
        if (partnerId && drawings[partnerId]?.image_url) {
          setPartnerDrawing(drawings[partnerId].image_url);
        }
      }
    } catch (err) {
      console.error("Failed to load drawings:", err);
    } finally {
      setLoading(false);
    }
  }, [coupleId, game?.id, currentUserId, partnerId]);

  React.useEffect(() => {
    loadDrawingData();
  }, [loadDrawingData]);

  // Realtime subscription
  React.useEffect(() => {
    if (!coupleId || !game?.id) return;

    const channel = supabase
      .channel(`realtime-drawing-play-${coupleId}-${game.id}`)
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
          setActivePlayId(row.id);
          const playData = (row.data as any) || {};
          const drawings = playData.drawings || {};

          if (currentUserId && drawings[currentUserId]?.image_url) {
            setMyDrawing(drawings[currentUserId].image_url);
          }
          if (partnerId && drawings[partnerId]?.image_url) {
            setPartnerDrawing(drawings[partnerId].image_url);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [coupleId, game?.id, currentUserId, partnerId]);

  // Timer countdown
  React.useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (timerActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setTimerActive(false);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timerActive, timeLeft]);

  // Pointer drawing coordinates helper
  const getCanvasCoords = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);

    const coords = getCanvasCoords(e);
    setIsDrawing(true);
    setLastPos(coords);

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.beginPath();
    ctx.arc(coords.x, coords.y, tool === "eraser" ? 8 : 1, 0, Math.PI * 2);
    ctx.fillStyle = tool === "eraser" ? "#FFFFFF" : "#1A1A1E";
    ctx.fill();
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !lastPos) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const coords = getCanvasCoords(e);

    ctx.beginPath();
    ctx.moveTo(lastPos.x, lastPos.y);
    ctx.lineTo(coords.x, coords.y);

    if (tool === "eraser") {
      ctx.strokeStyle = "#FFFFFF";
      ctx.lineWidth = 16;
    } else {
      ctx.strokeStyle = "#1A1A1E";
      ctx.lineWidth = 2;
    }

    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();

    setLastPos(coords);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    setIsDrawing(false);
    setLastPos(null);
  };

  // Clear canvas
  const handleClear = () => {
    initCanvas();
  };

  // Submit drawing
  const handleSubmitDrawing = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !coupleId || !game?.id || !currentUserId) return;
    setIsSubmitting(true);

    try {
      // 1. Export canvas as base64
      const base64Data = canvas.toDataURL("image/png");
      setMyDrawing(base64Data);

      // 2. Upload to Supabase Storage if possible, or store base64
      let finalImageUrl = base64Data;
      try {
        const res = await fetch(base64Data);
        const blob = await res.blob();
        const fileName = `drawing-${coupleId}-${currentUserId}-${Date.now()}.png`;

        const { data: uploadData, error: uploadErr } = await supabase.storage
          .from("moments")
          .upload(fileName, blob, {
            contentType: "image/png",
            upsert: true,
          });

        if (!uploadErr && uploadData?.path) {
          const { data: publicUrlData } = supabase.storage
            .from("moments")
            .getPublicUrl(uploadData.path);
          if (publicUrlData?.publicUrl) {
            finalImageUrl = publicUrlData.publicUrl;
          }
        }
      } catch (uploadError) {
        console.warn("Storage upload fallback to base64:", uploadError);
      }

      // 3. Save to game_plays
      const { data: existing } = await supabase
        .from("game_plays")
        .select("*")
        .eq("couple_id", coupleId)
        .eq("game_id", game.id)
        .maybeSingle();

      const existingData = (existing?.data as any) || {};
      const currentDrawings = existingData.drawings || {};

      const updatedDrawings = {
        ...currentDrawings,
        [currentUserId]: {
          image_url: finalImageUrl,
          artist_name: currentUserName,
          created_at: new Date().toISOString(),
        },
      };

      const updatedPayload = {
        ...existingData,
        type: "draw",
        prompt: activePrompt.title,
        drawings: updatedDrawings,
      };

      if (existing) {
        await supabase
          .from("game_plays")
          .update({ data: updatedPayload as any })
          .eq("id", existing.id);
      } else {
        const { data: newRow } = await supabase
          .from("game_plays")
          .insert({
            couple_id: coupleId,
            game_id: game.id,
            data: updatedPayload as any,
          })
          .select("id")
          .single();

        if (newRow) setActivePlayId(newRow.id);
      }
    } catch (err) {
      console.error("Failed to save drawing:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Save side-by-side battle result to Our Space
  const handleSaveToSpace = async () => {
    if (!coupleId || !currentUserId || savedToSpace || !myDrawing) return;

    try {
      const contentPayload = {
        game_title: "Drawing Battle",
        is_drawing: true,
        question: activePrompt.title,
        prompt: activePrompt.title,
        partner_a: currentUserName,
        pick_a: "Artist Sketch",
        image_a: myDrawing,
        partner_b: partnerName,
        pick_b: partnerDrawing ? "Artist Sketch" : "Cheered with love",
        image_b: partnerDrawing,
      };

      await supabase.from("moments").insert({
        couple_id: coupleId,
        author_id: currentUserId,
        type: "game",
        content: JSON.stringify(contentPayload),
      });

      setSavedToSpace(true);
    } catch (err) {
      console.error("Failed to save drawing moment:", err);
    }
  };

  // Reset to draw again
  const handleDrawAgain = () => {
    setMyDrawing(null);
    setSavedToSpace(false);
    setTimeout(() => {
      initCanvas();
    }, 50);
  };

  const handleNextPrompt = () => {
    const nextIdx = (promptIndex + 1) % DRAWING_PROMPTS.length;
    setPromptIndex(nextIdx);
    setMyDrawing(null);
    setPartnerDrawing(null);
    setSavedToSpace(false);
    setTimeLeft(60);
    setTimerActive(false);
    setTimeout(() => {
      initCanvas();
    }, 50);
  };

  if (loading) {
    return <div className="py-20 text-center text-xs text-inkSoft">Loading Drawing Battle...</div>;
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Top back link */}
      <Link
        href="/games"
        className="inline-flex items-center space-x-1.5 text-xs text-inkSoft hover:text-ink transition-colors"
      >
        <ArrowLeft size={16} strokeWidth={1.5} />
        <span>All Games</span>
      </Link>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center shadow-xs">
            <Image
              src={activePrompt.icon}
              alt="Prompt"
              width={48}
              height={48}
              className="w-12 h-12 object-contain"
            />
          </div>
          <div>
            <Pill className="text-[10px] py-0.5 px-2">Creative Battle</Pill>
            <h1 className="font-heading text-2xl text-ink font-normal pt-0.5">
              Drawing Battle
            </h1>
          </div>
        </div>

        <button
          type="button"
          onClick={handleNextPrompt}
          className="p-2 rounded-full hover:bg-canvas text-inkSoft hover:text-ink transition-colors"
          title="Switch prompt"
        >
          <Shuffle size={16} strokeWidth={1.5} />
        </button>
      </div>

      {/* Main Drawing Card */}
      <Card className="rounded-[24px] bg-white border border-border p-6 shadow-[0_8px_32px_rgba(255,90,126,0.08)] space-y-5">
        {/* Prompt top: "Draw our dream kitchen" */}
        <div className="text-center space-y-1">
          <h2 className="font-heading text-2xl text-ink font-normal">
            {activePrompt.title}
          </h2>
          <p className="text-xs text-inkSoft">{activePrompt.description}</p>
        </div>

        {/* Wholesome Notice & Optional Timer Bar */}
        <div className="flex items-center justify-between text-xs pt-1 border-t border-border/60">
          <div className="flex items-center space-x-1.5 text-[11px] text-inkSoft">
            <ShieldCheck size={14} strokeWidth={1.5} className="text-[#2C6E49]" />
            <span>Keep it wholesome</span>
          </div>

          {/* 60s Timer Optional */}
          <div className="flex items-center space-x-2">
            {timerActive ? (
              <div className="flex items-center space-x-1 px-2.5 py-1 rounded-full bg-blush/30 text-primary font-medium text-[11px] animate-pulse">
                <Clock size={12} strokeWidth={1.5} />
                <span>{timeLeft}s</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setTimeLeft(60);
                  setTimerActive(true);
                }}
                className="inline-flex items-center space-x-1 text-[11px] text-inkSoft hover:text-primary transition-colors"
              >
                <Clock size={12} strokeWidth={1.5} />
                <span>60s Timer</span>
              </button>
            )}
          </div>
        </div>

        {/* View: If already drawn, show side-by-side compare */}
        {myDrawing ? (
          <div className="space-y-5 pt-2">
            <div className="text-center space-y-1">
              <Pill className="text-[10px] py-0.5 px-2">Side by Side</Pill>
              <h3 className="font-heading text-xl text-ink">Our Dream Sketches</h3>
            </div>

            {/* Side-by-side comparison */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5 text-center">
                <span className="text-[10px] uppercase font-semibold text-primary block tracking-wider">
                  You ({currentUserName})
                </span>
                <div className="w-full aspect-square rounded-[16px] border border-border bg-white overflow-hidden shadow-xs relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={myDrawing}
                    alt="Your drawing"
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>

              <div className="space-y-1.5 text-center">
                <span className="text-[10px] uppercase font-semibold text-deep block tracking-wider">
                  {partnerName}
                </span>
                <div className="w-full aspect-square rounded-[16px] border border-border bg-white overflow-hidden shadow-xs flex items-center justify-center relative">
                  {partnerDrawing ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={partnerDrawing}
                      alt={`${partnerName}'s drawing`}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="p-3 text-center space-y-1">
                      <Clock size={20} strokeWidth={1.5} className="mx-auto text-primary/60 animate-pulse" />
                      <p className="text-[10px] text-inkSoft leading-tight">
                        Waiting for {partnerName} to finish...
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons: Button Save to Space & Draw Again */}
            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={handleSaveToSpace}
                disabled={savedToSpace}
                className={cn(
                  "w-full h-12 rounded-full font-medium text-xs transition-all flex items-center justify-center space-x-2 shadow-xs active:scale-[0.99]",
                  savedToSpace
                    ? "bg-[#DDF2E6] text-[#2C6E49] border border-[#BCE7CE]"
                    : "bg-primary hover:bg-deep text-white"
                )}
              >
                {savedToSpace ? (
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

              <button
                type="button"
                onClick={handleDrawAgain}
                className="w-full h-11 rounded-full bg-white hover:bg-canvas text-ink border border-border font-medium text-xs transition-colors flex items-center justify-center space-x-1.5"
              >
                <RotateCcw size={13} strokeWidth={1.5} />
                <span>Draw Again</span>
              </button>
            </div>
          </div>
        ) : (
          /* CANVAS DRAWING MODE: 1:1 300x300, 2px stroke, eraser, clear */
          <div className="space-y-4 flex flex-col items-center">
            {/* Canvas Container: 300x300 white, 1:1 */}
            <div className="relative w-[300px] h-[300px] rounded-[20px] overflow-hidden border border-border shadow-[0_4px_16px_rgba(26,26,30,0.06)] bg-white touch-none cursor-crosshair">
              <canvas
                ref={canvasRef}
                width={300}
                height={300}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
                className="w-full h-full block bg-white"
              />
            </div>

            {/* Canvas Controls: Pen, Eraser, Clear */}
            <div className="flex items-center justify-center space-x-2 w-full max-w-[300px]">
              {/* Pen Tool */}
              <button
                type="button"
                onClick={() => setTool("pen")}
                className={cn(
                  "flex-1 h-10 rounded-full text-xs font-medium border flex items-center justify-center space-x-1.5 transition-all select-none",
                  tool === "pen"
                    ? "bg-ink text-white border-ink shadow-xs"
                    : "bg-white hover:bg-canvas text-ink border-border"
                )}
              >
                <PenTool size={13} strokeWidth={1.5} />
                <span>Pen (2px)</span>
              </button>

              {/* Eraser Tool */}
              <button
                type="button"
                onClick={() => setTool("eraser")}
                className={cn(
                  "flex-1 h-10 rounded-full text-xs font-medium border flex items-center justify-center space-x-1.5 transition-all select-none",
                  tool === "eraser"
                    ? "bg-primary text-white border-primary shadow-xs"
                    : "bg-white hover:bg-canvas text-ink border-border"
                )}
              >
                <Eraser size={13} strokeWidth={1.5} />
                <span>Eraser</span>
              </button>

              {/* Clear */}
              <button
                type="button"
                onClick={handleClear}
                className="h-10 px-3 rounded-full text-xs font-medium bg-white hover:bg-canvas text-inkSoft hover:text-ink border border-border transition-colors flex items-center space-x-1 select-none"
                title="Clear canvas"
              >
                <RotateCcw size={13} strokeWidth={1.5} />
                <span>Clear</span>
              </button>
            </div>

            {/* Finish Button */}
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleSubmitDrawing}
              className="w-full max-w-[300px] h-12 rounded-full bg-primary hover:bg-deep text-white font-medium text-xs transition-all shadow-[0_8px_32px_rgba(255,90,126,0.15)] flex items-center justify-center space-x-2 active:scale-[0.99]"
            >
              {isSubmitting ? (
                <span>Saving Drawing...</span>
              ) : (
                <>
                  <Check size={16} strokeWidth={1.5} />
                  <span>Finish & Compare</span>
                </>
              )}
            </button>
          </div>
        )}
      </Card>
    </div>
  );
}
