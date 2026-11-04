"use client";

import * as React from "react";
import Image from "next/image";
import { Image as ImageIcon, Mic, Square, Send, Loader2, X, Play, Pause } from "lucide-react";
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
  const [content, setContent] = React.useState("");
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
  const [isPlayingAudio, setIsPlayingAudio] = React.useState(false);
  const audioPreviewRef = React.useRef<HTMLAudioElement | null>(null);
  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
  const timerIntervalRef = React.useRef<NodeJS.Timeout | null>(null);

  const resetForm = () => {
    setContent("");
    setSelectedFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setAudioBlob(null);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setIsRecording(false);
    setRecordSeconds(0);
    setIsPlayingAudio(false);
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
  };

  // Photo handler
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Images only. Please choose a photo.");
      return;
    }

    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
  };

  const removePhoto = () => {
    setSelectedFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Voice recording (30 seconds MAX)
  const startRecording = async () => {
    // Clear any previous voice note
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioBlob(null);
    setAudioUrl(null);

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
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start(200);
      setIsRecording(true);
      setRecordSeconds(0);

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
      alert("Please allow microphone access to record voice notes.");
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

  const removeAudio = () => {
    if (isPlayingAudio && audioPreviewRef.current) {
      audioPreviewRef.current.pause();
    }
    setAudioBlob(null);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setIsPlayingAudio(false);
    setRecordSeconds(0);
  };

  const togglePlayAudio = () => {
    if (!audioPreviewRef.current) return;
    if (isPlayingAudio) {
      audioPreviewRef.current.pause();
      setIsPlayingAudio(false);
    } else {
      audioPreviewRef.current.play();
      setIsPlayingAudio(true);
    }
  };

  // Submit Post
  const handlePost = async () => {
    if (isRecording) {
      stopRecording();
      return;
    }

    const hasText = Boolean(content.trim());
    const hasPhoto = Boolean(selectedFile);
    const hasVoice = Boolean(audioBlob);

    if (!hasText && !hasPhoto && !hasVoice) return;
    setIsSubmitting(true);

    try {
      let finalContent = content.trim();
      let momentType: "note" | "photo" | "voice" = "note";

      // Upload Photo if present
      if (selectedFile) {
        momentType = "photo";
        const fileExt = selectedFile.name.split(".").pop() || "jpg";
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
        const filePath = `photos/${fileName}`;

        const { error: uploadErr } = await supabase.storage
          .from("moments")
          .upload(filePath, selectedFile, { contentType: selectedFile.type });

        if (uploadErr) {
          console.warn("Storage upload fallback:", uploadErr);
        }

        const { data: urlData } = supabase.storage
          .from("moments")
          .getPublicUrl(filePath);

        finalContent = JSON.stringify({
          imageUrl: urlData?.publicUrl || previewUrl,
          caption: content.trim(),
        });
      } else if (audioBlob) {
        momentType = "voice";
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.webm`;
        const filePath = `voice/${fileName}`;

        const { error: uploadErr } = await supabase.storage
          .from("moments")
          .upload(filePath, audioBlob, { contentType: "audio/webm" });

        if (uploadErr) {
          console.warn("Storage voice upload fallback:", uploadErr);
        }

        const { data: urlData } = supabase.storage
          .from("moments")
          .getPublicUrl(filePath);

        finalContent = JSON.stringify({
          audioUrl: urlData?.publicUrl || audioUrl,
          durationSeconds: recordSeconds || 5,
          caption: content.trim(),
        });
      }

      const activeCoupleId = coupleId || "demo-couple-id";
      const activeAuthorId = authorId || "demo-author-id";

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

      if (error) {
        console.warn("Supabase insert warning:", error);
      }

      // Broadcast to partner immediately for fast real-time sync
      try {
        supabase.channel(`realtime-moments:${activeCoupleId}`).send({
          type: "broadcast",
          event: "new_moment_broadcast",
          payload: { moment: data || newMoment },
        });
      } catch (broadcastErr) {
        console.warn("Realtime broadcast note:", broadcastErr);
      }

      // Update feed
      onMomentPosted(data || newMoment);
      resetForm();
    } catch (err: any) {
      console.error("Posting moment error:", err);
      // Optimistic fallback
      const fallbackMoment = {
        id: crypto.randomUUID(),
        couple_id: coupleId || "local",
        author_id: authorId || "local",
        type: selectedFile ? "photo" : audioBlob ? "voice" : "note",
        content: selectedFile && previewUrl
          ? JSON.stringify({ imageUrl: previewUrl, caption: content.trim() })
          : audioUrl
          ? JSON.stringify({ audioUrl, durationSeconds: recordSeconds, caption: content.trim() })
          : content.trim(),
        created_at: new Date().toISOString(),
      };
      onMomentPosted(fallbackMoment);
      resetForm();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handlePost();
    }
  };

  const hasSendableContent = Boolean(
    content.trim() || selectedFile || audioBlob || isRecording
  );

  return (
    <div className="fixed bottom-[84px] left-0 right-0 z-40">
      <div className="mx-auto max-w-[480px] px-4 sm:px-6">
        <div className="bg-white rounded-[24px] border border-border shadow-[0_8px_32px_rgba(255,90,126,0.12)] p-2.5 transition-all">
          {/* Audio player element for preview */}
          {audioUrl && (
            <audio
              ref={audioPreviewRef}
              src={audioUrl}
              onEnded={() => setIsPlayingAudio(false)}
              className="hidden"
            />
          )}

          {/* Hidden photo file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handlePhotoSelect}
            className="hidden"
          />

          {/* PREVIEWS ROW: Photo chip or Voice Note preview chip */}
          {(previewUrl || audioUrl || isRecording) && (
            <div className="flex items-center gap-2 px-2 pb-2 pt-0.5 border-b border-border/40 mb-2">
              {/* Photo preview chip */}
              {previewUrl && (
                <div className="relative inline-flex items-center gap-2 bg-canvas border border-border rounded-xl p-1 pr-2.5">
                  <div className="relative w-8 h-8 rounded-lg overflow-hidden border border-border/60 bg-blush/20">
                    <Image
                      src={previewUrl}
                      alt="Upload preview"
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                  <span className="text-[11px] font-medium text-inkSoft truncate max-w-[120px]">
                    Photo attached
                  </span>
                  <button
                    type="button"
                    onClick={removePhoto}
                    aria-label="Remove photo"
                    className="w-5 h-5 rounded-full bg-canvas hover:bg-border/60 flex items-center justify-center text-inkSoft"
                  >
                    <X size={12} strokeWidth={2} />
                  </button>
                </div>
              )}

              {/* Voice recording in-progress indicator */}
              {isRecording && (
                <div className="flex items-center justify-between flex-1 bg-[#FF5A7E]/10 border border-[#FF5A7E]/20 rounded-xl px-3 py-1.5 animate-pulse">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-primary animate-ping" />
                    <span className="text-xs font-semibold text-primary">
                      Recording voice note ({recordSeconds}s / 30s)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={stopRecording}
                    className="h-7 px-2.5 rounded-lg bg-primary text-white text-[11px] font-medium flex items-center gap-1 active:scale-95 shadow-xs"
                  >
                    <Square size={10} className="fill-current" />
                    <span>Done</span>
                  </button>
                </div>
              )}

              {/* Recorded Audio ready chip */}
              {!isRecording && audioUrl && (
                <div className="relative inline-flex items-center gap-2 bg-[#FFC2CE]/20 border border-primary/20 rounded-xl p-1.5 pr-2.5">
                  <button
                    type="button"
                    onClick={togglePlayAudio}
                    className="w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center active:scale-95 transition-transform shadow-xs"
                  >
                    {isPlayingAudio ? (
                      <Pause size={12} className="fill-current" />
                    ) : (
                      <Play size={12} className="fill-current ml-0.5" />
                    )}
                  </button>
                  <span className="text-[11px] font-medium text-ink">
                    Voice Note ({recordSeconds}s)
                  </span>
                  <button
                    type="button"
                    onClick={removeAudio}
                    aria-label="Remove voice note"
                    className="w-5 h-5 rounded-full bg-white hover:bg-border/60 flex items-center justify-center text-inkSoft ml-1 border border-border/40"
                  >
                    <X size={11} strokeWidth={2} />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* MAIN CHAT INPUT ROW */}
          <div className="flex items-center gap-2">
            {/* 1. Photo attach button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              aria-label="Add photo"
              title="Add photo"
              className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center transition-colors flex-shrink-0",
                selectedFile
                  ? "bg-primary text-white"
                  : "bg-canvas text-inkSoft hover:text-primary hover:bg-[#FFC2CE]/30 border border-border"
              )}
            >
              <ImageIcon size={18} strokeWidth={1.5} />
            </button>

            {/* 2. Voice note record button */}
            <button
              type="button"
              onClick={isRecording ? stopRecording : startRecording}
              aria-label={isRecording ? "Stop recording" : "Record voice note"}
              title={isRecording ? "Stop recording" : "Record voice note"}
              className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center transition-all flex-shrink-0",
                isRecording
                  ? "bg-primary text-white ring-4 ring-[#FF5A7E]/20 animate-pulse"
                  : audioBlob
                  ? "bg-primary text-white"
                  : "bg-canvas text-inkSoft hover:text-primary hover:bg-[#FFC2CE]/30 border border-border"
              )}
            >
              {isRecording ? (
                <Square size={16} className="fill-current" />
              ) : (
                <Mic size={18} strokeWidth={1.5} />
              )}
            </button>

            {/* 3. Interactive Text Input ("What's on your heart?") */}
            <div className="flex-1 min-w-0">
              <input
                type="text"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="What's on your heart?"
                disabled={isSubmitting}
                className="w-full h-10 bg-canvas/60 rounded-[16px] px-3.5 text-sm text-ink placeholder:text-inkSoft/70 focus:outline-none focus:ring-1.5 focus:ring-primary/40 border border-border/70 transition-all"
              />
            </div>

            {/* 4. Send button */}
            <button
              type="button"
              onClick={handlePost}
              disabled={!hasSendableContent || isSubmitting}
              aria-label="Send moment"
              className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center transition-all flex-shrink-0 active:scale-95 shadow-sm",
                hasSendableContent && !isSubmitting
                  ? "bg-primary text-white hover:bg-deep shadow-[0_4px_16px_rgba(255,90,126,0.3)] cursor-pointer"
                  : "bg-canvas text-inkSoft/40 border border-border cursor-not-allowed"
              )}
            >
              {isSubmitting ? (
                <Loader2 size={16} className="animate-spin text-primary" />
              ) : (
                <Send size={16} strokeWidth={1.5} className="ml-0.5" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
