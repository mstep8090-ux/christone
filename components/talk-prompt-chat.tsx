"use client";

import * as React from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Mic,
  Square,
  Image as ImageIcon,
  Play,
  Pause,
  X,
  Reply,
  Loader2,
  Maximize2,
  Sparkles,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { uploadImageSafe, uploadAudioSafe } from "@/lib/media-upload";
import { cn } from "@/lib/utils";

export interface TalkPromptMessage {
  id: string;
  prompt_id: string;
  couple_id: string;
  sender_id: string;
  reply_to_id?: string | null;
  content?: string | null;
  message_type: string;
  media_url?: string | null;
  metadata?: any;
  created_at: string;
}

interface TalkPromptChatProps {
  promptId: string;
  coupleId: string;
  currentUserId: string;
  currentUserName: string;
  partnerId?: string;
  partnerName: string;
  myAnswerText?: string;
  partnerAnswerText?: string;
}

export function TalkPromptChat({
  promptId,
  coupleId,
  currentUserId,
  currentUserName,
  partnerId,
  partnerName,
  myAnswerText,
  partnerAnswerText,
}: TalkPromptChatProps) {
  const [messages, setMessages] = React.useState<TalkPromptMessage[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [inputText, setInputText] = React.useState("");
  const [isSending, setIsSending] = React.useState(false);

  // Replying state
  const [replyTarget, setReplyTarget] = React.useState<{
    id?: string;
    authorName: string;
    text: string;
  } | null>(null);

  // Photo state
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);

  // Voice recording state
  const [isRecording, setIsRecording] = React.useState(false);
  const [recordSeconds, setRecordSeconds] = React.useState(0);
  const [audioBlob, setAudioBlob] = React.useState<Blob | null>(null);
  const [recordedAudioUrl, setRecordedAudioUrl] = React.useState<string | null>(null);
  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
  const audioChunksRef = React.useRef<Blob[]>([]);
  const timerRef = React.useRef<NodeJS.Timeout | null>(null);

  // Audio playback state
  const [playingMessageId, setPlayingMessageId] = React.useState<string | null>(null);
  const activeAudioRef = React.useRef<HTMLAudioElement | null>(null);

  // Partner typing indicator
  const [isPartnerTyping, setIsPartnerTyping] = React.useState(false);
  const partnerTypingTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const lastTypingBroadcastRef = React.useRef<number>(0);

  // Lightbox modal for full-res image preview
  const [lightboxUrl, setLightboxUrl] = React.useState<string | null>(null);

  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // 1. Fetch existing messages for this prompt
  const loadMessages = React.useCallback(async () => {
    if (!promptId || !coupleId) return;
    try {
      const { data, error } = await supabase
        .from("talk_prompt_messages")
        .select("*")
        .eq("prompt_id", promptId)
        .eq("couple_id", coupleId)
        .order("created_at", { ascending: true });

      if (error) {
        console.warn("Failed to load prompt chat messages:", error);
      } else if (data) {
        setMessages(data as unknown as TalkPromptMessage[]);
      }
    } finally {
      setLoading(false);
    }
  }, [promptId, coupleId]);

  React.useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  // Scroll to bottom when messages load or change
  React.useEffect(() => {
    if (!loading) {
      scrollToBottom();
    }
  }, [messages.length, loading]);

  // 2. Realtime subscription + typing broadcast
  React.useEffect(() => {
    if (!promptId || !coupleId) return;

    const channelName = `prompt_chat_${promptId}_${coupleId}`;
    const channel = supabase.channel(channelName, {
      config: { broadcast: { self: false } },
    });

    channel
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "talk_prompt_messages",
          filter: `prompt_id=eq.${promptId}`,
        },
        (payload) => {
          const newMsg = payload.new as TalkPromptMessage;
          if (!newMsg?.id) return;
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
          scrollToBottom();
        }
      )
      .on("broadcast", { event: "new_prompt_message" }, (payload) => {
        if (payload?.payload?.message) {
          const bMsg = payload.payload.message as TalkPromptMessage;
          setMessages((prev) => {
            if (prev.some((m) => m.id === bMsg.id)) return prev;
            return [...prev, bMsg];
          });
          scrollToBottom();
        }
      })
      .on("broadcast", { event: "typing_status" }, (payload) => {
        const sender = payload?.payload?.sender_id;
        if (sender && sender !== currentUserId) {
          setIsPartnerTyping(true);
          if (partnerTypingTimerRef.current) {
            clearTimeout(partnerTypingTimerRef.current);
          }
          partnerTypingTimerRef.current = setTimeout(() => {
            setIsPartnerTyping(false);
          }, 3500);
        }
      })
      .subscribe();

    // Fast polling fallback (every 2.5s) to guarantee zero missed messages
    const pollInterval = setInterval(() => {
      loadMessages();
    }, 2500);

    return () => {
      clearInterval(pollInterval);
      if (partnerTypingTimerRef.current) clearTimeout(partnerTypingTimerRef.current);
      supabase.removeChannel(channel);
    };
  }, [promptId, coupleId, currentUserId, loadMessages]);

  // Broadcast typing throttled
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);

    const now = Date.now();
    if (now - lastTypingBroadcastRef.current > 1500) {
      lastTypingBroadcastRef.current = now;
      const channelName = `prompt_chat_${promptId}_${coupleId}`;
      supabase.channel(channelName).send({
        type: "broadcast",
        event: "typing_status",
        payload: { sender_id: currentUserId, sender_name: currentUserName },
      });
    }
  };

  // 3. Photo selection handler
  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Images only. Please select a photo.");
      return;
    }

    setSelectedFile(file);
    // Instant base64 data preview so it never revokes or shows broken
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setPreviewUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const removePhoto = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // 4. Voice recording handlers
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        setAudioBlob(audioBlob);
        const url = URL.createObjectURL(audioBlob);
        setRecordedAudioUrl(url);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordSeconds(0);

      timerRef.current = setInterval(() => {
        setRecordSeconds((prev) => {
          if (prev >= 45) {
            stopRecording();
            return 45;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err) {
      console.warn("Microphone access denied or unsupported:", err);
      alert("Microphone permission required to record a voice note.");
    }
  };

  const stopRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const removeAudio = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsRecording(false);
    setAudioBlob(null);
    if (recordedAudioUrl) URL.revokeObjectURL(recordedAudioUrl);
    setRecordedAudioUrl(null);
    setRecordSeconds(0);
  };

  // 5. Send message
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isRecording) {
      stopRecording();
      return;
    }

    const hasText = Boolean(inputText.trim());
    const hasPhoto = Boolean(selectedFile || previewUrl);
    const hasAudio = Boolean(audioBlob);

    if (!hasText && !hasPhoto && !hasAudio) return;
    setIsSending(true);

    try {
      let messageType: "text" | "voice" | "photo" = "text";
      let mediaUrl: string | null = null;
      let metadata: any = {};

      if (replyTarget) {
        metadata.reply_author_name = replyTarget.authorName;
        metadata.reply_snippet = replyTarget.text.slice(0, 120);
      }

      if (selectedFile) {
        messageType = "photo";
        const { url } = await uploadImageSafe(selectedFile, "moments", "photos");
        mediaUrl = url;
        if (inputText.trim()) {
          metadata.caption = inputText.trim();
        }
      } else if (audioBlob) {
        messageType = "voice";
        const { url } = await uploadAudioSafe(audioBlob, "moments", "voice");
        mediaUrl = url;
        metadata.duration_seconds = recordSeconds || 3;
        if (inputText.trim()) {
          metadata.caption = inputText.trim();
        }
      }

      const tempId = `temp-${Date.now()}`;
      const payload: Partial<TalkPromptMessage> = {
        prompt_id: promptId,
        couple_id: coupleId,
        sender_id: currentUserId,
        reply_to_id: replyTarget?.id || null,
        content: messageType === "text" ? inputText.trim() : null,
        message_type: messageType,
        media_url: mediaUrl,
        metadata,
      };

      // Optimistic append
      const optimisticMsg: TalkPromptMessage = {
        id: tempId,
        prompt_id: promptId,
        couple_id: coupleId,
        sender_id: currentUserId,
        reply_to_id: replyTarget?.id || null,
        content: payload.content || null,
        message_type: messageType,
        media_url: mediaUrl,
        metadata,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, optimisticMsg]);
      scrollToBottom();

      // Clear input fields immediately for snappy UI
      setInputText("");
      setReplyTarget(null);
      removePhoto();
      removeAudio();

      // Insert to Supabase database
      const { data: insertedData, error: insertErr } = await (supabase as any)
        .from("talk_prompt_messages")
        .insert(payload)
        .select()
        .single();

      if (insertErr) {
        console.warn("Error inserting prompt message:", insertErr);
      } else if (insertedData) {
        // Swap temp optimistic ID with permanent DB ID
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? (insertedData as unknown as TalkPromptMessage) : m))
        );

        // Broadcast to partner instantly
        const channelName = `prompt_chat_${promptId}_${coupleId}`;
        supabase.channel(channelName).send({
          type: "broadcast",
          event: "new_prompt_message",
          payload: { message: insertedData },
        });
      }
    } catch (err) {
      console.error("Failed to send message:", err);
    } finally {
      setIsSending(false);
    }
  };

  // Audio playback toggle for a voice message
  const togglePlayAudio = (messageId: string, url?: string | null) => {
    if (!url) return;
    if (playingMessageId === messageId) {
      activeAudioRef.current?.pause();
      setPlayingMessageId(null);
      return;
    }

    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
    }

    const audio = new Audio(url);
    activeAudioRef.current = audio;
    setPlayingMessageId(messageId);

    audio.onended = () => {
      setPlayingMessageId(null);
    };
    audio.onerror = () => {
      setPlayingMessageId(null);
    };
    audio.play().catch(() => setPlayingMessageId(null));
  };

  return (
    <div className="flex flex-col space-y-3 pt-3 border-t border-border/80">
      {/* Thread Header & Quick Reply Prompts */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-primary" />
          <h4 className="font-heading text-lg text-ink font-normal">
            Deepen The Conversation
          </h4>
        </div>
        <span className="text-[11px] font-medium text-inkSoft">
          {messages.length} {messages.length === 1 ? "thought" : "thoughts"}
        </span>
      </div>

      {/* Quick Reply Pills to Original Answers */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
        {partnerAnswerText && (
          <button
            type="button"
            onClick={() =>
              setReplyTarget({
                authorName: partnerName,
                text: partnerAnswerText,
              })
            }
            className="flex-shrink-0 inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-blush/30 border border-blush hover:bg-blush/50 text-[11px] font-medium text-ink transition-colors"
          >
            <Reply size={12} className="text-primary" />
            <span>Reply to {partnerName}&apos;s answer</span>
          </button>
        )}
        {myAnswerText && (
          <button
            type="button"
            onClick={() =>
              setReplyTarget({
                authorName: "Your answer",
                text: myAnswerText,
              })
            }
            className="flex-shrink-0 inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-canvas border border-border hover:bg-border/40 text-[11px] font-medium text-inkSoft transition-colors"
          >
            <Reply size={12} />
            <span>Add to your answer</span>
          </button>
        )}
      </div>

      {/* Messages Stream Container */}
      <div className="relative min-h-[140px] max-h-[280px] overflow-y-auto space-y-2.5 p-3 rounded-[20px] bg-canvas/60 border border-border/60">
        {loading ? (
          <div className="py-8 flex flex-col items-center justify-center text-center space-y-2 text-inkSoft">
            <Loader2 size={18} className="animate-spin text-primary" />
            <span className="text-xs">Connecting conversation...</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="py-8 flex flex-col items-center justify-center text-center space-y-1.5 px-4">
            <div className="w-8 h-8 rounded-full bg-blush/40 text-primary flex items-center justify-center">
              <Sparkles size={16} />
            </div>
            <p className="text-xs font-semibold text-ink">Private Chat On This Prompt</p>
            <p className="text-[11px] text-inkSoft max-w-xs leading-relaxed">
              Now that both answers are revealed, talk more, reply with voice notes, or share photos together.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender_id === currentUserId;
            const hasReply = Boolean(msg.metadata?.reply_snippet);

            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className={cn("flex flex-col", isMe ? "items-end" : "items-start")}
              >
                {/* Quoted Reply Banner */}
                {hasReply && (
                  <div
                    className={cn(
                      "flex items-center space-x-1.5 text-[10px] mb-1 px-2.5 py-0.5 rounded-t-lg max-w-[82%] border-l-2",
                      isMe
                        ? "bg-primary/10 border-primary text-ink text-right"
                        : "bg-blush/30 border-deep text-ink text-left"
                    )}
                  >
                    <Reply size={10} className="text-primary flex-shrink-0" />
                    <span className="font-semibold">{msg.metadata?.reply_author_name}:</span>
                    <span className="truncate italic">{msg.metadata?.reply_snippet}</span>
                  </div>
                )}

                {/* Message Bubble */}
                <div
                  className={cn(
                    "relative group max-w-[85%] rounded-[18px] p-3 text-xs leading-relaxed shadow-xs transition-all",
                    isMe
                      ? "bg-primary text-white rounded-br-[4px]"
                      : "bg-white border border-border text-ink rounded-bl-[4px]"
                  )}
                >
                  {/* Photo Message */}
                  {msg.message_type === "photo" && msg.media_url && (
                    <div className="space-y-1.5">
                      <div
                        onClick={() => setLightboxUrl(msg.media_url || null)}
                        className="relative w-48 h-48 rounded-[12px] overflow-hidden border border-black/10 cursor-pointer bg-black/5"
                      >
                        <Image
                          src={msg.media_url}
                          alt="Attached photo"
                          fill
                          unoptimized
                          decoding="async"
                          className="object-cover hover:scale-105 transition-transform"
                        />
                        <div className="absolute top-1.5 right-1.5 bg-black/40 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                          <Maximize2 size={12} />
                        </div>
                      </div>
                      {msg.metadata?.caption && (
                        <p className={isMe ? "text-white/95" : "text-ink"}>
                          {msg.metadata.caption}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Voice Note Message */}
                  {msg.message_type === "voice" && msg.media_url && (
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2.5 pr-2">
                        <button
                          type="button"
                          onClick={() => togglePlayAudio(msg.id, msg.media_url)}
                          className={cn(
                            "w-7 h-7 rounded-full flex items-center justify-center transition-transform active:scale-95 shadow-xs",
                            isMe ? "bg-white text-primary" : "bg-primary text-white"
                          )}
                        >
                          {playingMessageId === msg.id ? (
                            <Pause size={12} className="fill-current" />
                          ) : (
                            <Play size={12} className="fill-current ml-0.5" />
                          )}
                        </button>
                        <div className="flex items-center space-x-1">
                          {[8, 14, 18, 10, 16, 22, 12, 16, 10, 14].map((h, i) => (
                            <span
                              key={i}
                              style={{ height: `${h}px` }}
                              className={cn(
                                "w-[2px] rounded-full transition-colors",
                                playingMessageId === msg.id
                                  ? isMe
                                    ? "bg-white animate-pulse"
                                    : "bg-primary animate-pulse"
                                  : isMe
                                  ? "bg-white/60"
                                  : "bg-blush"
                              )}
                            />
                          ))}
                        </div>
                        <span className={cn("text-[10px] font-mono", isMe ? "text-white/80" : "text-inkSoft")}>
                          {msg.metadata?.duration_seconds || 3}s
                        </span>
                      </div>
                      {msg.metadata?.caption && (
                        <p className={isMe ? "text-white/95" : "text-ink"}>
                          {msg.metadata.caption}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Regular Text Message */}
                  {msg.message_type === "text" && (
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  )}

                  {/* Timestamp & Quick Reply Button */}
                  <div className="flex items-center justify-between pt-1 space-x-2">
                    <span
                      className={cn(
                        "text-[9px]",
                        isMe ? "text-white/70" : "text-inkSoft/70"
                      )}
                    >
                      {new Date(msg.created_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setReplyTarget({
                          id: msg.id,
                          authorName: isMe ? "You" : partnerName,
                          text: msg.content || msg.metadata?.caption || (msg.message_type === "photo" ? "Photo" : "Voice note"),
                        })
                      }
                      className={cn(
                        "opacity-0 group-hover:opacity-100 transition-opacity text-[10px] flex items-center space-x-0.5",
                        isMe ? "text-white/90 hover:underline" : "text-primary hover:underline"
                      )}
                    >
                      <Reply size={10} />
                      <span>Reply</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })
        )}

        {/* Live Partner Typing Indicator */}
        {isPartnerTyping && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center space-x-2 p-2 rounded-xl bg-white border border-border text-xs text-inkSoft w-fit"
          >
            <span className="font-medium text-ink">{partnerName}</span>
            <span>is typing</span>
            <div className="flex space-x-1">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" />
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ACTIVE PREVIEWS / ATTACHMENTS BAR */}
      {(replyTarget || previewUrl || recordedAudioUrl || isRecording) && (
        <div className="p-2 rounded-xl bg-white border border-border space-y-1.5 shadow-xs">
          {/* Active Reply Banner */}
          {replyTarget && (
            <div className="flex items-center justify-between text-xs bg-[#FFF5F7] border border-blush/60 rounded-lg p-2">
              <div className="flex items-center space-x-1.5 truncate">
                <Reply size={12} className="text-primary flex-shrink-0" />
                <span className="font-semibold text-ink text-[11px]">
                  Replying to {replyTarget.authorName}:
                </span>
                <span className="text-[11px] text-inkSoft truncate max-w-[200px] italic">
                  &ldquo;{replyTarget.text}&rdquo;
                </span>
              </div>
              <button
                type="button"
                onClick={() => setReplyTarget(null)}
                aria-label="Cancel reply"
                className="w-5 h-5 rounded-full hover:bg-border/60 flex items-center justify-center text-inkSoft"
              >
                <X size={12} />
              </button>
            </div>
          )}

          {/* Photo Attachment Chip */}
          {previewUrl && (
            <div className="flex items-center justify-between bg-canvas border border-border rounded-lg p-1.5 pr-2.5">
              <div className="flex items-center space-x-2">
                <div className="relative w-8 h-8 rounded-md overflow-hidden border border-border">
                  <Image
                    src={previewUrl}
                    alt="Preview"
                    fill
                    unoptimized
                    className="object-cover"
                  />
                </div>
                <span className="text-[11px] font-medium text-ink">Photo attached</span>
              </div>
              <button
                type="button"
                onClick={removePhoto}
                aria-label="Remove photo"
                className="w-5 h-5 rounded-full hover:bg-border/60 flex items-center justify-center text-inkSoft"
              >
                <X size={12} />
              </button>
            </div>
          )}

          {/* Voice Recording Live Banner */}
          {isRecording && (
            <div className="flex items-center justify-between bg-primary/10 border border-primary/30 rounded-lg px-3 py-1.5 animate-pulse">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-primary animate-ping" />
                <span className="text-xs font-semibold text-primary">
                  Recording voice note ({recordSeconds}s / 45s)
                </span>
              </div>
              <button
                type="button"
                onClick={stopRecording}
                className="h-6 px-2.5 rounded-md bg-primary text-white text-[11px] font-medium flex items-center space-x-1 active:scale-95"
              >
                <Square size={10} className="fill-current" />
                <span>Done</span>
              </button>
            </div>
          )}

          {/* Voice Note Ready Chip */}
          {!isRecording && recordedAudioUrl && (
            <div className="flex items-center justify-between bg-blush/20 border border-blush/60 rounded-lg p-1.5 pr-2.5">
              <div className="flex items-center space-x-2">
                <span className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center">
                  <Play size={10} className="fill-current ml-0.5" />
                </span>
                <span className="text-[11px] font-medium text-ink">
                  Voice Note ({recordSeconds}s) ready to send
                </span>
              </div>
              <button
                type="button"
                onClick={removeAudio}
                aria-label="Remove voice note"
                className="w-5 h-5 rounded-full hover:bg-border/60 flex items-center justify-center text-inkSoft"
              >
                <X size={12} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* RICH COMPOSER INPUT BAR */}
      <form onSubmit={handleSendMessage} className="flex items-center space-x-1.5">
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handlePhotoSelect}
          className="hidden"
        />

        {/* Photo button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          aria-label="Add photo"
          title="Add photo"
          className={cn(
            "w-9 h-9 rounded-full flex items-center justify-center transition-colors flex-shrink-0",
            selectedFile
              ? "bg-primary text-white"
              : "bg-canvas text-inkSoft hover:text-primary hover:bg-blush/30 border border-border"
          )}
        >
          <ImageIcon size={16} strokeWidth={1.5} />
        </button>

        {/* Mic voice record button */}
        <button
          type="button"
          onClick={isRecording ? stopRecording : startRecording}
          aria-label={isRecording ? "Stop recording" : "Record voice note"}
          title={isRecording ? "Stop recording" : "Record voice note"}
          className={cn(
            "w-9 h-9 rounded-full flex items-center justify-center transition-all flex-shrink-0",
            isRecording
              ? "bg-primary text-white ring-4 ring-primary/20 animate-pulse"
              : audioBlob
              ? "bg-primary text-white"
              : "bg-canvas text-inkSoft hover:text-primary hover:bg-blush/30 border border-border"
          )}
        >
          {isRecording ? (
            <Square size={14} className="fill-current" />
          ) : (
            <Mic size={16} strokeWidth={1.5} />
          )}
        </button>

        {/* Text Input */}
        <div className="flex-1 min-w-0">
          <input
            type="text"
            value={inputText}
            onChange={handleInputChange}
            placeholder={
              replyTarget
                ? `Replying to ${replyTarget.authorName}...`
                : "Type a thought or reaction..."
            }
            disabled={isSending}
            className="w-full h-9 bg-canvas rounded-full px-3.5 text-xs text-ink placeholder:text-inkSoft/70 focus:outline-none focus:ring-1.5 focus:ring-primary/40 border border-border transition-all"
          />
        </div>

        {/* Send Button */}
        <button
          type="submit"
          disabled={
            isSending ||
            (!inputText.trim() && !selectedFile && !audioBlob && !isRecording)
          }
          aria-label="Send message"
          className={cn(
            "w-9 h-9 rounded-full flex items-center justify-center transition-all flex-shrink-0 active:scale-95 shadow-xs",
            (inputText.trim() || selectedFile || audioBlob || isRecording) && !isSending
              ? "bg-primary text-white hover:bg-deep shadow-[0_4px_16px_rgba(255,90,126,0.3)] cursor-pointer"
              : "bg-canvas text-inkSoft/40 border border-border cursor-not-allowed"
          )}
        >
          {isSending ? (
            <Loader2 size={14} className="animate-spin text-primary" />
          ) : (
            <Send size={14} strokeWidth={1.5} className="ml-0.5" />
          )}
        </button>
      </form>

      {/* FULLSCREEN PHOTO LIGHTBOX */}
      <AnimatePresence>
        {lightboxUrl && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setLightboxUrl(null)}
              className="fixed inset-0 bg-ink/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="relative z-10 max-w-[90vw] max-h-[85vh] flex flex-col items-center"
            >
              <button
                type="button"
                onClick={() => setLightboxUrl(null)}
                aria-label="Close preview"
                className="absolute -top-12 right-0 w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-colors shadow-md"
              >
                <X size={18} strokeWidth={2} />
              </button>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={lightboxUrl}
                alt="Full preview"
                className="max-w-full max-h-[80vh] rounded-[20px] object-contain shadow-2xl border border-white/20 bg-black/40"
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
