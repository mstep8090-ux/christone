"use client";

import * as React from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Sparkles, Heart } from "lucide-react";
import { Pill } from "@/components/ui/pill";
import { cn } from "@/lib/utils";

export interface MomentItem {
  id: string;
  couple_id: string;
  author_id: string;
  type: string;
  content: string;
  created_at: string;
  author_name?: string;
  author_avatar?: string;
  isNew?: boolean;
}

function formatTimeAgo(dateString?: string): string {
  if (!dateString) return "Just now";
  const now = Date.now();
  const past = new Date(dateString).getTime();
  const diffSec = Math.max(0, Math.floor((now - past) / 1000));

  if (diffSec < 60) return "Just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;
  const diffDays = Math.floor(diffHour / 24);
  if (diffDays === 1) return "Yesterday";
  return `${diffDays}d ago`;
}

function MinimalVoicePlayer({ audioUrl }: { audioUrl: string }) {
  const [isPlaying, setIsPlaying] = React.useState(false);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const waveBars = [6, 12, 18, 10, 22, 16, 12, 20, 14, 8, 16, 22, 12, 18, 14, 8, 16, 10, 14, 6];

  return (
    <div className="flex items-center space-x-3 p-3 rounded-[16px] bg-canvas border border-border">
      <audio
        ref={audioRef}
        src={audioUrl}
        onEnded={() => setIsPlaying(false)}
        className="hidden"
      />
      <button
        type="button"
        onClick={togglePlay}
        className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center flex-shrink-0 active:scale-95 transition-transform shadow-sm"
      >
        {isPlaying ? (
          <span className="w-2.5 h-2.5 bg-white rounded-xs" />
        ) : (
          <svg width="10" height="12" viewBox="0 0 10 12" fill="none">
            <path d="M1 1L9 6L1 11V1Z" fill="white" />
          </svg>
        )}
      </button>

      <div className="flex items-center space-x-1 flex-1 h-6">
        {waveBars.map((height, i) => (
          <span
            key={i}
            className={`w-[3px] rounded-full transition-colors ${
              isPlaying ? "bg-primary" : "bg-blush"
            }`}
            style={{ height: `${height}px` }}
          />
        ))}
      </div>
    </div>
  );
}

export function MomentCard({ moment }: { moment: MomentItem }) {
  let parsed: any = null;
  if (typeof moment.content === "string" && moment.content.startsWith("{")) {
    try {
      parsed = JSON.parse(moment.content);
    } catch (_) {}
  }

  const authorInitial = moment.author_name ? moment.author_name.charAt(0).toUpperCase() : "♥";
  const authorName = moment.author_name || "Partner";
  const timeAgo = formatTimeAgo(moment.created_at);

  // Mood color styling for checkin moments
  const isCheckin = moment.type === "checkin";
  const mood = parsed?.mood as "peaceful" | "heavy" | "joyful" | undefined;

  const moodStyles: Record<string, { bg: string; border: string; pillColor: string; pillBg: string; label: string }> = {
    peaceful: {
      bg: "bg-[#DDF2E6]/50",
      border: "border-[#BCE7CE]",
      pillBg: "bg-[#DDF2E6]",
      pillColor: "text-[#2C6E49]",
      label: "Peaceful",
    },
    heavy: {
      bg: "bg-[#F5E6E8]/70",
      border: "border-[#E8D3D6]",
      pillBg: "bg-[#F5E6E8]",
      pillColor: "text-[#6B5B5F]",
      label: "Heavy",
    },
    joyful: {
      bg: "bg-[#FFC2CE]/40",
      border: "border-[#FFAEBE]",
      pillBg: "bg-[#FFC2CE]",
      pillColor: "text-[#E84367]",
      label: "Joyful",
    },
  };

  const activeMoodStyle = mood ? moodStyles[mood] : null;

  return (
    <motion.article
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className={cn(
        "relative rounded-[24px] p-4 shadow-[0_8px_32px_rgba(255,90,126,0.08)] space-y-3 transition-colors",
        isCheckin && activeMoodStyle
          ? `${activeMoodStyle.bg} border ${activeMoodStyle.border}`
          : "bg-white border border-border"
      )}
    >
      {/* Top Header: Author Avatar 24px + Name + Time ago + Subtle Rose Dot */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="w-6 h-6 rounded-full bg-blush/60 border border-white flex items-center justify-center text-[11px] font-heading font-medium text-ink shadow-xs overflow-hidden shrink-0">
            {moment.author_avatar ? (
              <Image
                src={moment.author_avatar}
                alt={authorName}
                width={24}
                height={24}
                className="w-full h-full object-cover"
                unoptimized={moment.author_avatar.startsWith("data:")}
              />
            ) : (
              authorInitial
            )}
          </div>
          <div className="flex items-center space-x-1.5 text-[12px] text-inkSoft">
            <span className="font-medium text-ink">{authorName}</span>
            <span>•</span>
            <span>{timeAgo}</span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Checkin Mood Pill */}
          {isCheckin && activeMoodStyle && (
            <span
              className={cn(
                "text-[11px] font-medium py-1 px-3 rounded-full border border-black/5 flex items-center space-x-1",
                activeMoodStyle.pillBg,
                activeMoodStyle.pillColor
              )}
            >
              <Heart size={10} strokeWidth={1.5} className="fill-current" />
              <span>{activeMoodStyle.label}</span>
            </span>
          )}

          {/* Prayer Tag */}
          {moment.type === "prayer" && (
            <Pill active className="text-[10px] py-0.5 px-2 flex items-center space-x-1">
              <Sparkles size={10} strokeWidth={1.5} />
              <span>Prayer</span>
            </Pill>
          )}

          {/* Weekly Review Tag */}
          {moment.type === "review" && (
            <Pill active className="text-[10px] py-0.5 px-2 flex items-center space-x-1">
              <Sparkles size={10} strokeWidth={1.5} />
              <span>Sunday Review</span>
            </Pill>
          )}

          {/* Subtle rose dot on new */}
          {moment.isNew && (
            <span
              title="New moment"
              className="w-2 h-2 rounded-full bg-primary animate-pulse"
            />
          )}
        </div>
      </div>

      {/* Checkin Note Content */}
      {isCheckin && (
        <div className="pt-0.5">
          <p className="text-[15px] leading-[1.5] text-ink font-body">
            Feeling {activeMoodStyle ? activeMoodStyle.label.toLowerCase() : "today"}
            {parsed?.note ? `: "${parsed.note}"` : "."}
          </p>
        </div>
      )}

      {/* Photo (16px radius inside) */}
      {moment.type === "photo" && (
        <div className="space-y-2">
          <div className="relative h-60 w-full rounded-[16px] overflow-hidden border border-border bg-canvas">
            <Image
              src={parsed?.imageUrl || moment.content}
              alt="Moment photo"
              fill
              className="object-cover"
            />
          </div>
          {parsed?.caption && (
            <p className="text-[15px] leading-[1.5] text-ink font-body">
              {parsed.caption}
            </p>
          )}
        </div>
      )}

      {/* Voice player minimal with static waveform */}
      {moment.type === "voice" && (
        <div className="space-y-2">
          <MinimalVoicePlayer audioUrl={parsed?.audioUrl || moment.content} />
          {parsed?.caption && (
            <p className="text-[15px] leading-[1.5] text-ink font-body">
              {parsed.caption}
            </p>
          )}
        </div>
      )}

      {/* Talk Moment */}
      {moment.type === "talk" && (
        <div className="space-y-2.5 pt-1">
          <div className="flex items-center space-x-1.5 text-[11px] text-primary font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            <span>{parsed?.deck_title || "Talk Moment"}</span>
          </div>
          <h4 className="font-heading text-[17px] text-ink leading-snug">
            {parsed?.question || moment.content}
          </h4>
          {parsed?.answers && Array.isArray(parsed.answers) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              {parsed.answers.map((ans: any, i: number) => (
                <div
                  key={i}
                  className={cn(
                    "p-3 rounded-[16px] border text-xs",
                    i === 0
                      ? "bg-blush/20 border-blush/40"
                      : "bg-canvas border-border"
                  )}
                >
                  <span className="font-semibold text-ink block mb-1">
                    {ans.name}
                  </span>
                  <p className="text-inkSoft leading-relaxed font-body whitespace-pre-wrap">
                    {ans.answer}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Game Moment */}
      {moment.type === "game" && (
        <div className="space-y-2.5 pt-1">
          <div className="flex items-center space-x-1.5 text-[11px] text-primary font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            <span>{parsed?.game_title || "Couple Game"}</span>
          </div>
          <h4 className="font-heading text-[17px] text-ink leading-snug">
            {parsed?.question || moment.content}
          </h4>

          {parsed?.is_trivia && (
            <div className="p-3 rounded-[16px] bg-[#DDF2E6]/60 border border-[#BCE7CE] text-xs space-y-1.5">
              <p className="font-semibold text-[#2C6E49]">{parsed.result_text || "You both learned!"}</p>
              {parsed.explanation && (
                <p className="text-[12px] text-inkSoft leading-relaxed">{parsed.explanation}</p>
              )}
              {parsed.partner_a && (
                <div className="grid grid-cols-2 gap-2 pt-0.5 text-[11px]">
                  <div className="p-2 rounded-[12px] bg-white border border-[#BCE7CE]">
                    <span className="text-inkSoft block text-[10px]">{parsed.partner_a}</span>
                    <span className="font-medium text-ink">{parsed.pick_a}</span>
                  </div>
                  <div className="p-2 rounded-[12px] bg-white border border-[#BCE7CE]">
                    <span className="text-inkSoft block text-[10px]">{parsed.partner_b}</span>
                    <span className="font-medium text-ink">{parsed.pick_b}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {parsed?.is_quiz && (
            <div className="p-3.5 rounded-[16px] bg-blush/20 border border-blush/40 text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-primary">{parsed.score_text || "Quiz Result"}</span>
                <span className="text-[10px] text-inkSoft">
                  {parsed.creator_name ? `About ${parsed.creator_name}` : ""}
                </span>
              </div>
              <p className="text-[12px] text-ink leading-relaxed">
                {parsed.celebration || "You know each other so deeply!"}
              </p>
            </div>
          )}

          {parsed?.is_drawing && (
            <div className="space-y-2 pt-1">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="space-y-1 text-center">
                  <span className="text-[10px] text-primary font-medium block">
                    {parsed.partner_a}
                  </span>
                  <div className="w-full aspect-square rounded-[14px] border border-border bg-white overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={parsed.image_a}
                      alt={`${parsed.partner_a}'s drawing`}
                      className="w-full h-full object-contain"
                    />
                  </div>
                </div>
                <div className="space-y-1 text-center">
                  <span className="text-[10px] text-deep font-medium block">
                    {parsed.partner_b}
                  </span>
                  <div className="w-full aspect-square rounded-[14px] border border-border bg-white overflow-hidden flex items-center justify-center">
                    {parsed.image_b ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={parsed.image_b}
                        alt={`${parsed.partner_b}'s drawing`}
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <span className="text-[10px] text-inkSoft">Waiting...</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {parsed?.is_photo_challenge && (
            <div className="space-y-2 pt-1">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="space-y-1 text-center">
                  <span className="text-[10px] text-primary font-medium block">
                    {parsed.partner_a}
                  </span>
                  <div className="w-full aspect-[4/5] rounded-[14px] border border-border bg-canvas overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={parsed.image_a}
                      alt={`${parsed.partner_a}'s photo`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
                <div className="space-y-1 text-center">
                  <span className="text-[10px] text-deep font-medium block">
                    {parsed.partner_b}
                  </span>
                  <div className="w-full aspect-[4/5] rounded-[14px] border border-border bg-canvas overflow-hidden flex items-center justify-center">
                    {parsed.image_b ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={parsed.image_b}
                        alt={`${parsed.partner_b}'s photo`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-[10px] text-inkSoft">Waiting...</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {!parsed?.is_trivia && !parsed?.is_quiz && !parsed?.is_drawing && !parsed?.is_photo_challenge && parsed?.partner_a && (
            <div className="p-3 rounded-[16px] bg-canvas border border-border text-xs space-y-1.5">
              {parsed.is_match ? (
                <p className="font-semibold text-[#2C6E49]">It&apos;s a Match! 🎉</p>
              ) : (
                <p className="font-semibold text-deep">You picked different — talk about it!</p>
              )}
              <div className="grid grid-cols-2 gap-2 pt-0.5 text-[11px]">
                <div className="p-2 rounded-[12px] bg-white border border-border">
                  <span className="text-inkSoft block text-[10px]">{parsed.partner_a}</span>
                  <span className="font-medium text-ink">{parsed.pick_a}</span>
                </div>
                <div className="p-2 rounded-[12px] bg-blush/20 border border-blush/40">
                  <span className="text-inkSoft block text-[10px]">{parsed.partner_b}</span>
                  <span className="font-medium text-ink">{parsed.pick_b}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Weekly Review Moment */}
      {moment.type === "review" && (
        <div className="space-y-3 pt-1">
          <div className="flex items-center space-x-1.5 text-[11px] text-primary font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            <span>Weekly Check-in</span>
          </div>
          <h4 className="font-heading text-[18px] text-ink leading-snug">
            Sunday Reflections & Prayer
          </h4>

          {parsed?.answers && typeof parsed.answers === "object" && (
            <div className="space-y-2 pt-0.5">
              {Object.entries(parsed.answers).map(([q, a], idx) => (
                <div key={idx} className="p-3 rounded-[16px] bg-canvas border border-border text-xs space-y-1">
                  <span className="font-semibold text-ink block text-[11px]">{q}</span>
                  <p className="text-inkSoft leading-relaxed font-body whitespace-pre-wrap">
                    {String(a)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Text / Note / Prayer Content */}
      {(moment.type === "note" || moment.type === "prayer") && (
        <p className="text-[15px] leading-[1.5] text-ink font-body whitespace-pre-wrap">
          {moment.content}
        </p>
      )}
    </motion.article>
  );
}
