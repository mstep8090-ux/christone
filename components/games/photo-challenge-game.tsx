"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Sparkles,
  Check,
  Camera,
  Upload,
  RotateCcw,
  Clock,
  Heart,
  AlertCircle,
  Shuffle,
} from "lucide-react";
import { Pill } from "@/components/ui/pill";
import { Card } from "@/components/ui/card";
import { supabase } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface PhotoChallengeGameProps {
  game: any;
  coupleId: string;
  currentUserId: string;
  currentUserName: string;
  partnerId: string;
  partnerName: string;
}

const PHOTO_PROMPTS = [
  "Recreate your first photo",
  "Recreate our very first date pose",
  "Sweetest candid smile",
  "Holding hands walking together",
  "Our favorite coffee cup moment",
];

export function PhotoChallengeGame({
  game,
  coupleId,
  currentUserId,
  currentUserName,
  partnerId,
  partnerName,
}: PhotoChallengeGameProps) {
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const [promptIndex, setPromptIndex] = React.useState<number>(0);
  const activePrompt = PHOTO_PROMPTS[promptIndex];

  const [myPhoto, setMyPhoto] = React.useState<string | null>(null);
  const [partnerPhoto, setPartnerPhoto] = React.useState<string | null>(null);
  const [isUploading, setIsUploading] = React.useState<boolean>(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [savedToSpace, setSavedToSpace] = React.useState<boolean>(false);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [activePlayId, setActivePlayId] = React.useState<string | null>(null);

  // Load existing photos from game_plays
  const loadPhotoData = React.useCallback(async () => {
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
        const photos = playData.photos || {};

        if (playData.prompt) {
          const pIdx = PHOTO_PROMPTS.indexOf(playData.prompt);
          if (pIdx !== -1) setPromptIndex(pIdx);
        }

        if (currentUserId && photos[currentUserId]?.image_url) {
          setMyPhoto(photos[currentUserId].image_url);
        }
        const pKey = partnerId || Object.keys(photos).find((k) => k !== currentUserId);
        if (pKey && photos[pKey]?.image_url) {
          setPartnerPhoto(photos[pKey].image_url);
        }
      }
    } catch (err) {
      console.error("Failed to load photo challenge data:", err);
    } finally {
      setLoading(false);
    }
  }, [coupleId, game?.id, currentUserId, partnerId]);

  React.useEffect(() => {
    loadPhotoData();
  }, [loadPhotoData]);

  // Realtime subscription
  React.useEffect(() => {
    if (!coupleId || !game?.id) return;

    const channel = supabase
      .channel(`realtime-photo-play-${coupleId}-${game.id}`)
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
          const photos = playData.photos || {};

          if (currentUserId && photos[currentUserId]?.image_url) {
            setMyPhoto(photos[currentUserId].image_url);
          }
          const pKey = partnerId || Object.keys(photos).find((k) => k !== currentUserId);
          if (pKey && photos[pKey]?.image_url) {
            setPartnerPhoto(photos[pKey].image_url);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [coupleId, game?.id, currentUserId, partnerId]);

  // Handle photo file selection
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !coupleId || !game?.id || !currentUserId) return;

    setErrorMsg(null);

    // Rule: DO NOT store large files > 2MB
    const MAX_SIZE = 2 * 1024 * 1024; // 2MB
    if (file.size > MAX_SIZE) {
      setErrorMsg("File exceeds 2MB limit. Please choose a smaller photo under 2MB.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setIsUploading(true);

    try {
      // 1. Upload to Supabase Storage bucket 'moments'
      const ext = file.name.split(".").pop() || "jpg";
      const fileName = `photo-challenge-${coupleId}-${currentUserId}-${Date.now()}.${ext}`;

      let publicUrl = "";
      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from("moments")
        .upload(fileName, file, {
          contentType: file.type,
          upsert: true,
        });

      if (!uploadErr && uploadData?.path) {
        const { data: publicUrlData } = supabase.storage
          .from("moments")
          .getPublicUrl(uploadData.path);
        if (publicUrlData?.publicUrl) {
          publicUrl = publicUrlData.publicUrl;
        }
      }

      // If upload failed or returned no public url, read as base64
      if (!publicUrl) {
        publicUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      }

      setMyPhoto(publicUrl);

      // 2. Save to game_plays table
      const { data: existing } = await supabase
        .from("game_plays")
        .select("*")
        .eq("couple_id", coupleId)
        .eq("game_id", game.id)
        .maybeSingle();

      const existingData = (existing?.data as any) || {};
      const currentPhotos = existingData.photos || {};

      const updatedPhotos = {
        ...currentPhotos,
        [currentUserId]: {
          image_url: publicUrl,
          uploader_name: currentUserName,
          uploaded_at: new Date().toISOString(),
        },
      };

      const updatedPayload = {
        ...existingData,
        type: "photo",
        prompt: activePrompt,
        photos: updatedPhotos,
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
      console.error("Failed to upload photo:", err);
      setErrorMsg("Failed to upload photo. Please try again.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Save side-by-side challenge result to Our Space
  const handleSaveToSpace = async () => {
    if (!coupleId || !currentUserId || savedToSpace || !myPhoto) return;

    try {
      const contentPayload = {
        game_title: "Photo Challenge",
        is_photo_challenge: true,
        question: activePrompt,
        prompt: activePrompt,
        partner_a: currentUserName,
        pick_a: "Challenge Photo",
        image_a: myPhoto,
        partner_b: partnerName,
        pick_b: partnerPhoto ? "Challenge Photo" : "Cheered with love",
        image_b: partnerPhoto,
      };

      await supabase.from("moments").insert({
        couple_id: coupleId,
        author_id: currentUserId,
        type: "game",
        content: JSON.stringify(contentPayload),
      });

      setSavedToSpace(true);
    } catch (err) {
      console.error("Failed to save photo challenge moment:", err);
    }
  };

  // Switch challenge prompt
  const handleNextPrompt = () => {
    const nextIdx = (promptIndex + 1) % PHOTO_PROMPTS.length;
    setPromptIndex(nextIdx);
    setMyPhoto(null);
    setPartnerPhoto(null);
    setSavedToSpace(false);
    setErrorMsg(null);
  };

  if (loading) {
    return <div className="py-20 text-center text-xs text-inkSoft">Loading Photo Challenge...</div>;
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
              src="/icons/games/photo.svg"
              alt="Photo Challenge"
              width={48}
              height={48}
              className="w-12 h-12 object-contain"
            />
          </div>
          <div>
            <Pill className="text-[10px] py-0.5 px-2">Visual Challenge</Pill>
            <h1 className="font-heading text-2xl text-ink font-normal pt-0.5">
              Photo Challenge
            </h1>
          </div>
        </div>

        <button
          type="button"
          onClick={handleNextPrompt}
          className="p-2 rounded-full hover:bg-canvas text-inkSoft hover:text-ink transition-colors"
          title="Switch challenge prompt"
        >
          <Shuffle size={16} strokeWidth={1.5} />
        </button>
      </div>

      {/* Main Challenge Card */}
      <Card className="rounded-[24px] bg-white border border-border p-6 shadow-[0_8px_32px_rgba(255,90,126,0.08)] space-y-5">
        {/* Prompt top: "Recreate your first photo" */}
        <div className="text-center space-y-1">
          <Pill className="text-[10px] py-0.5 px-2.5">Couple Prompt</Pill>
          <h2 className="font-heading text-2xl text-ink font-normal pt-1">
            &ldquo;{activePrompt}&rdquo;
          </h2>
          <p className="text-xs text-inkSoft">
            Both snap or upload your shot to compare side by side.
          </p>
        </div>

        {/* Error notification if file > 2MB */}
        {errorMsg && (
          <div className="p-3 rounded-[16px] bg-[#F5E6E8] border border-primary/20 flex items-center space-x-2 text-xs text-deep">
            <AlertCircle size={14} strokeWidth={1.5} className="shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />

        {/* View: If current user uploaded photo, show side-by-side compare */}
        {myPhoto ? (
          <div className="space-y-5 pt-1">
            <div className="text-center space-y-1">
              <span className="text-[11px] font-semibold text-inkSoft uppercase tracking-wider block">
                Side by Side Challenge
              </span>
            </div>

            {/* Side-by-side photo comparison */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5 text-center">
                <span className="text-[10px] uppercase font-semibold text-primary block tracking-wider">
                  You ({currentUserName})
                </span>
                <div className="w-full aspect-[4/5] rounded-[18px] border border-border bg-canvas overflow-hidden shadow-xs relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={myPhoto}
                    alt="Your challenge upload"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>

              <div className="space-y-1.5 text-center">
                <span className="text-[10px] uppercase font-semibold text-deep block tracking-wider">
                  {partnerName}
                </span>
                <div className="w-full aspect-[4/5] rounded-[18px] border border-border bg-canvas overflow-hidden shadow-xs flex items-center justify-center relative">
                  {partnerPhoto ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={partnerPhoto}
                      alt={`${partnerName}'s challenge upload`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="p-4 text-center space-y-1.5">
                      <Clock size={22} strokeWidth={1.5} className="mx-auto text-primary/60 animate-pulse" />
                      <p className="text-[10px] text-inkSoft leading-tight">
                        Waiting for {partnerName} to upload...
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons: Button Save to Space & Retake */}
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
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-11 rounded-full bg-white hover:bg-canvas text-ink border border-border font-medium text-xs transition-colors flex items-center justify-center space-x-1.5"
              >
                <Camera size={13} strokeWidth={1.5} />
                <span>Change Photo</span>
              </button>
            </div>
          </div>
        ) : (
          /* UPLOAD PROMPT */
          <div className="space-y-4 pt-1">
            <button
              type="button"
              disabled={isUploading}
              onClick={() => fileInputRef.current?.click()}
              className="w-full aspect-[4/3] rounded-[20px] border-2 border-dashed border-border hover:border-primary/50 bg-canvas/50 hover:bg-blush/10 transition-all flex flex-col items-center justify-center space-y-2 p-6 cursor-pointer select-none active:scale-[0.99]"
            >
              <div className="w-12 h-12 rounded-full bg-blush/30 border border-primary/20 flex items-center justify-center text-primary">
                <Camera size={22} strokeWidth={1.5} />
              </div>
              <div className="text-center space-y-0.5">
                <span className="text-xs font-semibold text-ink block">
                  {isUploading ? "Uploading photo..." : "Upload or Take Photo"}
                </span>
                <span className="text-[11px] text-inkSoft block">
                  Max size 2MB (JPEG, PNG, WebP)
                </span>
              </div>
            </button>
          </div>
        )}
      </Card>
    </div>
  );
}
