"use client";

import * as React from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Image as ImageIcon, Mic, Sparkles, X, Square, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Pill } from "@/components/ui/pill";
import { supabase } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface ComposerSheetProps {
  coupleId: string | null;
  authorId: string | null;
  onMomentPosted: (moment: any) => void;
}

export function ComposerSheet({
  coupleId,
  authorId,
  onMomentPosted,
}: ComposerSheetProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [content, setContent] = React.useState("");
  const [momentType, setMomentType] = React.useState<"note" | "photo" | "voice" | "prayer">("note");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Photo state
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);

  // Voice recording state
  const [isRecording, setIsRecording] = React.useState(false);
  const [recordSeconds, setRecordSeconds] = React.useState(0);
  const [audioBlob, setAudioBlob] = React.useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = React.useState<string | null>(null);
  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
  const timerIntervalRef = React.useRef<NodeJS.Timeout | null>(null);

  // Reset form
  const resetForm = () => {
    setContent("");
    setMomentType("note");
    setSelectedFile(null);
    setPreviewUrl(null);
    setAudioBlob(null);
    setAudioUrl(null);
    setIsRecording(false);
    setRecordSeconds(0);
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
  };

  const closeSheet = () => {
    resetForm();
    setIsOpen(false);
  };

  // Photo handler
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Strict safety: Images only, NO VIDEO
    if (!file.type.startsWith("image/")) {
      alert("Images only. Video upload is not allowed.");
      return;
    }

    setSelectedFile(file);
    setMomentType("photo");
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
  };

  // Voice recording (30 seconds MAX)
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      const chunks: BlobPart[] = [];

      mediaRecorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) chunks.push(ev.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: "audio/webm" });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        setMomentType("voice");
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start(200);
      setIsRecording(true);
      setRecordSeconds(0);

      // 30s countdown timer
      timerIntervalRef.current = setInterval(() => {
        setRecordSeconds((prev) => {
          if (prev >= 29) {
            stopRecording();
            return 30;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err) {
      console.error("Microphone access error:", err);
      alert("Microphone access is needed for voice notes.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
  };

  // Prayer toggle
  const togglePrayer = () => {
    if (momentType === "prayer") {
      setMomentType("note");
    } else {
      setMomentType("prayer");
    }
  };

  // Submit Post
  const handlePost = async () => {
    if (!content.trim() && !selectedFile && !audioBlob) return;
    setIsSubmitting(true);

    try {
      let finalContent = content.trim();

      // Upload Photo if present
      if (selectedFile) {
        const fileExt = selectedFile.name.split(".").pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
        const filePath = `photos/${fileName}`;

        const { error: uploadErr } = await supabase.storage
          .from("moments")
          .upload(filePath, selectedFile, { contentType: selectedFile.type });

        if (uploadErr) throw uploadErr;

        const { data: urlData } = supabase.storage
          .from("moments")
          .getPublicUrl(filePath);

        // Store as JSON or image URL with caption
        finalContent = JSON.stringify({
          imageUrl: urlData.publicUrl,
          caption: content.trim(),
        });
      }

      // Upload Audio if present
      if (audioBlob) {
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.webm`;
        const filePath = `voice/${fileName}`;

        const { error: uploadErr } = await supabase.storage
          .from("moments")
          .upload(filePath, audioBlob, { contentType: "audio/webm" });

        if (uploadErr) throw uploadErr;

        const { data: urlData } = supabase.storage
          .from("moments")
          .getPublicUrl(filePath);

        finalContent = JSON.stringify({
          audioUrl: urlData.publicUrl,
          durationSeconds: recordSeconds,
          caption: content.trim(),
        });
      }

      const activeCoupleId = coupleId || "demo-couple-id";
      const activeAuthorId = authorId || "demo-author-id";

      // 1. Insert into moments table
      const newMoment = {
        id: crypto.randomUUID(),
        couple_id: activeCoupleId,
        author_id: activeAuthorId,
        type: momentType,
        content: finalContent,
        created_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from("moments")
        .insert({
          couple_id: activeCoupleId,
          author_id: activeAuthorId,
          type: momentType,
          content: finalContent,
        })
        .select()
        .maybeSingle();

      // Show in feed instantly
      onMomentPosted(data || newMoment);
      closeSheet();
    } catch (err: any) {
      console.error("Posting moment error:", err);
      // Fallback optimistic post
      const fallbackMoment = {
        id: crypto.randomUUID(),
        couple_id: coupleId || "local",
        author_id: authorId || "local",
        type: momentType,
        content: selectedFile && previewUrl
          ? JSON.stringify({ imageUrl: previewUrl, caption: content })
          : audioUrl
          ? JSON.stringify({ audioUrl, durationSeconds: recordSeconds, caption: content })
          : content.trim(),
        created_at: new Date().toISOString(),
      };
      onMomentPosted(fallbackMoment);
      closeSheet();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* 1. STICKY TRIGGER BAR ABOVE NAV (Height 56px, White card 16px radius) */}
      <div className="fixed bottom-[88px] left-0 right-0 z-30 pointer-events-none">
        <div className="mx-auto max-w-[480px] px-6">
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="pointer-events-auto h-[56px] w-full rounded-[16px] bg-white border border-border shadow-[0_8px_32px_rgba(255,90,126,0.08)] px-5 flex items-center justify-between text-left transition-all active:scale-[0.99] hover:border-primary/40 select-none"
          >
            <span className="text-sm text-inkSoft/70">
              What's on your heart?
            </span>
            <div className="flex items-center space-x-2 text-inkSoft/60">
              <ImageIcon size={18} strokeWidth={1.5} />
              <Mic size={18} strokeWidth={1.5} />
              <Sparkles size={18} strokeWidth={1.5} />
            </div>
          </button>
        </div>
      </div>

      {/* 2. BOTTOM SHEET MODAL */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[60] flex items-end justify-center">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeSheet}
              className="absolute inset-0 bg-ink/30 backdrop-blur-sm"
            />

            {/* Sheet Panel */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 250 }}
              className="relative z-10 w-full max-w-[480px] rounded-t-[28px] bg-white border-t border-border shadow-[0_-8px_32px_rgba(255,90,126,0.12)] p-6 pb-10 sm:pb-6 space-y-4 max-h-[88vh] overflow-y-auto"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-2 border-b border-border/50">
                <div className="flex items-center space-x-2">
                  <span className="font-heading text-xl text-ink font-normal">
                    Share Moment
                  </span>
                  {momentType === "prayer" && (
                    <Pill active className="text-[11px] py-0.5 px-2.5">
                      Prayer
                    </Pill>
                  )}
                  {momentType === "photo" && (
                    <Pill className="text-[11px] py-0.5 px-2.5">
                      Photo
                    </Pill>
                  )}
                  {momentType === "voice" && (
                    <Pill className="text-[11px] py-0.5 px-2.5">
                      Voice ({recordSeconds}s)
                    </Pill>
                  )}
                </div>
                <button
                  type="button"
                  onClick={closeSheet}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-inkSoft hover:bg-canvas transition-colors"
                >
                  <X size={18} strokeWidth={1.5} />
                </button>
              </div>

              {/* Textarea */}
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="What's on your heart?"
                rows={4}
                autoFocus
                className="w-full resize-none bg-canvas/40 rounded-[16px] border border-border p-4 text-sm text-ink placeholder:text-inkSoft/60 focus:outline-none focus:ring-1 focus:ring-primary leading-relaxed"
              />

              {/* Photo Preview */}
              {previewUrl && (
                <div className="relative rounded-[16px] overflow-hidden border border-border h-48 w-full bg-canvas">
                  <Image
                    src={previewUrl}
                    alt="Preview"
                    fill
                    className="object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFile(null);
                      setPreviewUrl(null);
                      setMomentType("note");
                    }}
                    className="absolute top-2 right-2 w-7 h-7 rounded-full bg-ink/70 text-white flex items-center justify-center hover:bg-ink transition-colors"
                  >
                    <X size={14} strokeWidth={1.5} />
                  </button>
                </div>
              )}

              {/* Audio Player Preview */}
              {audioUrl && !isRecording && (
                <div className="flex items-center justify-between p-3.5 rounded-[16px] bg-canvas border border-border">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center">
                      <Mic size={16} strokeWidth={1.5} />
                    </div>
                    <audio src={audioUrl} controls className="h-8 max-w-[220px]" />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setAudioBlob(null);
                      setAudioUrl(null);
                      setRecordSeconds(0);
                      setMomentType("note");
                    }}
                    className="text-xs text-inkSoft hover:text-deep"
                  >
                    Remove
                  </button>
                </div>
              )}

              {/* Recording in Progress Banner */}
              {isRecording && (
                <div className="flex items-center justify-between p-3.5 rounded-[16px] bg-blush/30 border border-primary/30">
                  <div className="flex items-center space-x-2">
                    <span className="w-3 h-3 rounded-full bg-primary animate-ping" />
                    <span className="text-xs font-semibold text-primary">
                      Recording: {recordSeconds}s / 30s max
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={stopRecording}
                    className="h-8 px-3 text-xs flex items-center space-x-1"
                  >
                    <Square size={12} strokeWidth={1.5} />
                    <span>Done</span>
                  </Button>
                </div>
              )}

              {/* Action Buttons & Post Footer */}
              <div className="flex items-center justify-between pt-2">
                {/* 3 Icon Buttons */}
                <div className="flex items-center space-x-2">
                  {/* Photo Button */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    title="Upload Photo"
                    className="w-11 h-11 rounded-full border border-border bg-white flex items-center justify-center text-inkSoft hover:text-primary hover:border-primary transition-all active:scale-95"
                  >
                    <ImageIcon size={20} strokeWidth={1.5} />
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handlePhotoSelect}
                    className="hidden"
                  />

                  {/* Voice Button (30s max) */}
                  <button
                    type="button"
                    onClick={isRecording ? stopRecording : startRecording}
                    title="Record Voice Note"
                    className={cn(
                      "w-11 h-11 rounded-full border border-border bg-white flex items-center justify-center transition-all active:scale-95",
                      isRecording
                        ? "border-primary bg-primary text-white"
                        : "text-inkSoft hover:text-primary hover:border-primary"
                    )}
                  >
                    <Mic size={20} strokeWidth={1.5} />
                  </button>

                  {/* Prayer Button */}
                  <button
                    type="button"
                    onClick={togglePrayer}
                    title="Tag as Prayer"
                    className={cn(
                      "w-11 h-11 rounded-full border border-border bg-white flex items-center justify-center transition-all active:scale-95",
                      momentType === "prayer"
                        ? "border-primary bg-primary text-white"
                        : "text-inkSoft hover:text-primary hover:border-primary"
                    )}
                  >
                    <Sparkles size={20} strokeWidth={1.5} />
                  </button>
                </div>

                {/* Post Button */}
                <Button
                  type="button"
                  variant="primary"
                  disabled={isSubmitting || (!content.trim() && !selectedFile && !audioBlob)}
                  onClick={handlePost}
                  className="h-11 px-6 rounded-full text-sm font-medium flex items-center space-x-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={16} strokeWidth={1.5} className="animate-spin" />
                      <span>Posting...</span>
                    </>
                  ) : (
                    <>
                      <span>Post</span>
                      <Send size={14} strokeWidth={1.5} />
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
