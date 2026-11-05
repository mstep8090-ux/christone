"use client";

import * as React from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, PhoneOff, Sparkles, Volume2 } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { ringtone } from "@/lib/ringtone";
import { showWebNotification } from "@/lib/notifications";
import { cn } from "@/lib/utils";

interface PrayerCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  coupleId: string;
  currentUserId: string;
  currentUserName: string;
  currentUserAvatar?: string | null;
  partnerId: string;
  partnerName: string;
  partnerAvatar?: string | null;
  isCaller: boolean;
  onPrayerCompleted?: () => void;
}

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
    { urls: "stun:stun.cloudflare.com:3478" },
  ],
};

export function PrayerCallModal({
  isOpen,
  onClose,
  coupleId,
  currentUserId,
  currentUserName,
  currentUserAvatar,
  partnerId,
  partnerName,
  partnerAvatar,
  isCaller,
  onPrayerCompleted,
}: PrayerCallModalProps) {
  const [callState, setCallState] = React.useState<"waiting" | "picked" | "connected" | "ended">(
    isCaller ? "waiting" : "picked"
  );
  const [isMuted, setIsMuted] = React.useState(false);
  const [callDuration, setCallDuration] = React.useState(0);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  // Audio and WebRTC references
  const localStreamRef = React.useRef<MediaStream | null>(null);
  const peerConnectionRef = React.useRef<RTCPeerConnection | null>(null);
  const remoteAudioRef = React.useRef<HTMLAudioElement | null>(null);
  const durationTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const channelRef = React.useRef<any>(null);

  // ICE candidate queue to prevent InvalidStateError
  const iceCandidateQueueRef = React.useRef<RTCIceCandidateInit[]>([]);
  const hasRemoteDescriptionRef = React.useRef<boolean>(false);
  const cleanupIntervalsRef = React.useRef<(() => void) | null>(null);

  // Clean up all resources
  const cleanupCall = React.useCallback(() => {
    ringtone.stopAll();

    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current);
      durationTimerRef.current = null;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = null;
    }

    iceCandidateQueueRef.current = [];
    hasRemoteDescriptionRef.current = false;
  }, []);

  // End Call handler
  const handleEndCall = React.useCallback(
    async (completedNormally = true) => {
      ringtone.playEndSound();

      try {
        if (channelRef.current && coupleId) {
          channelRef.current.send({
            type: "broadcast",
            event: "prayer_call_end",
            payload: { endedBy: currentUserId },
          });
        }

        // Update database call record to ended
        if (coupleId) {
          await supabase
            .from("prayer_calls")
            .update({ status: "ended", updated_at: new Date().toISOString() })
            .eq("couple_id", coupleId)
            .neq("status", "ended");
        }
      } catch (_) {}

      cleanupCall();
      setCallState("ended");

      if (completedNormally && callDuration >= 5 && onPrayerCompleted) {
        onPrayerCompleted();
      }

      setTimeout(() => {
        onClose();
      }, 1000);
    },
    [coupleId, currentUserId, cleanupCall, callDuration, onPrayerCompleted, onClose]
  );

  // Toggle Mute
  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks();
      audioTracks.forEach((track) => {
        track.enabled = isMuted;
      });
      setIsMuted(!isMuted);
    }
  };

  // Format seconds to mm:ss
  const formatSeconds = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  // Drain ICE Candidate Queue helper
  const drainIceCandidates = async (pc: RTCPeerConnection) => {
    while (iceCandidateQueueRef.current.length > 0) {
      const candidate = iceCandidateQueueRef.current.shift();
      if (candidate) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          console.warn("Buffered ICE candidate note:", e);
        }
      }
    }
  };

  // Main WebRTC & Realtime Signaling Effect
  React.useEffect(() => {
    if (!isOpen || !coupleId || !currentUserId) return;

    let isSubscribed = true;

    async function initWebRTC() {
      try {
        setErrorMessage(null);
        setCallDuration(0);
        iceCandidateQueueRef.current = [];
        hasRemoteDescriptionRef.current = false;

        if (isCaller) {
          setCallState("waiting");
          ringtone.startOutgoingRing();
        } else {
          setCallState("picked");
          ringtone.stopAll();
          ringtone.playConnectedSound();
        }

        // 1. Get microphone with audio processing
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
          video: false,
        });

        if (!isSubscribed) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        localStreamRef.current = stream;

        // 2. Initialize RTCPeerConnection
        const pc = new RTCPeerConnection(RTC_CONFIG);
        peerConnectionRef.current = pc;

        // Add local tracks to peer connection
        stream.getAudioTracks().forEach((track) => {
          pc.addTrack(track, stream);
        });

        // Remote track handler (when partner's audio arrives)
        pc.ontrack = (event) => {
          console.log("[WebRTC] Remote track received:", event.streams);
          const remoteStream = event.streams[0] || new MediaStream([event.track]);
          if (remoteAudioRef.current) {
            remoteAudioRef.current.srcObject = remoteStream;
            remoteAudioRef.current.muted = false;
            remoteAudioRef.current.volume = 1.0;
            remoteAudioRef.current.play().catch((err) => {
              console.warn("[WebRTC] Autoplay retry note:", err);
            });
          }
          ringtone.stopAll();
          setCallState("connected");
        };

        // ICE candidate generation
        pc.onicecandidate = (event) => {
          if (event.candidate && channelRef.current) {
            channelRef.current.send({
              type: "broadcast",
              event: "webrtc_ice",
              payload: {
                from: currentUserId,
                candidate: event.candidate,
              },
            });
          }
        };

        pc.onconnectionstatechange = () => {
          console.log("[WebRTC] Connection state:", pc.connectionState);
          if (pc.connectionState === "connected") {
            ringtone.stopAll();
            setCallState("connected");
          }
        };

        // 3. Connect Supabase Realtime Channel
        const channelName = `prayer_voice_${coupleId}`;
        const channel = supabase.channel(channelName, {
          config: { broadcast: { self: false } },
        });
        channelRef.current = channel;

        // Helper: Caller creates and sends offer
        const sendOffer = async () => {
          if (!pc) return;
          try {
            const offer = await pc.createOffer({ offerToReceiveAudio: true });
            await pc.setLocalDescription(offer);
            channel.send({
              type: "broadcast",
              event: "webrtc_offer",
              payload: {
                from: currentUserId,
                offer,
              },
            });
          } catch (err) {
            console.error("[WebRTC] Error creating offer:", err);
          }
        };

        // Broadcast Event Listeners
        channel
          .on("broadcast", { event: "prayer_call_picked" }, async (payload) => {
            if (isCaller && payload.payload.from !== currentUserId) {
              console.log("[WebRTC] Partner picked call! Sending offer...");
              ringtone.stopAll();
              ringtone.playConnectedSound();
              setCallState("picked");
              await sendOffer();
            }
          })
          .on("broadcast", { event: "webrtc_offer" }, async (payload) => {
            if (!isCaller && payload.payload.from !== currentUserId) {
              console.log("[WebRTC] Received offer! Creating answer...");
              try {
                await pc.setRemoteDescription(new RTCSessionDescription(payload.payload.offer));
                hasRemoteDescriptionRef.current = true;
                await drainIceCandidates(pc);

                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);

                channel.send({
                  type: "broadcast",
                  event: "webrtc_answer",
                  payload: {
                    from: currentUserId,
                    answer,
                  },
                });

                ringtone.stopAll();
                setCallState("connected");
              } catch (err) {
                console.error("[WebRTC] Error handling offer:", err);
              }
            }
          })
          .on("broadcast", { event: "webrtc_answer" }, async (payload) => {
            if (isCaller && payload.payload.from !== currentUserId) {
              console.log("[WebRTC] Received answer! Finalizing connection...");
              try {
                await pc.setRemoteDescription(new RTCSessionDescription(payload.payload.answer));
                hasRemoteDescriptionRef.current = true;
                await drainIceCandidates(pc);

                ringtone.stopAll();
                setCallState("connected");
              } catch (err) {
                console.error("[WebRTC] Error handling answer:", err);
              }
            }
          })
          .on("broadcast", { event: "webrtc_ice" }, async (payload) => {
            if (payload.payload.from !== currentUserId && payload.payload.candidate) {
              const candidate = payload.payload.candidate;
              if (hasRemoteDescriptionRef.current && pc.remoteDescription) {
                try {
                  await pc.addIceCandidate(new RTCIceCandidate(candidate));
                } catch (e) {
                  console.warn("[WebRTC] ICE candidate add note:", e);
                }
              } else {
                iceCandidateQueueRef.current.push(candidate);
              }
            }
          })
          .on("broadcast", { event: "prayer_call_end" }, () => {
            ringtone.playEndSound();
            cleanupCall();
            setCallState("ended");
            setTimeout(() => {
              onClose();
            }, 1000);
          })
          .subscribe(async (status) => {
            if (status === "SUBSCRIBED") {
              if (isCaller) {
                // 1. Insert/upsert into prayer_calls table so partner gets real-time trigger anywhere
                await supabase.from("prayer_calls").insert({
                  couple_id: coupleId,
                  caller_id: currentUserId,
                  caller_name: currentUserName,
                  status: "calling",
                });

                // 2. Broadcast incoming call to active listeners
                channel.send({
                  type: "broadcast",
                  event: "prayer_call_incoming",
                  payload: {
                    callerId: currentUserId,
                    callerName: currentUserName,
                    callerAvatar: currentUserAvatar,
                  },
                });

                // 3. Trigger native browser web notification
                showWebNotification(`🙏 Prayer Call from ${currentUserName}`, {
                  body: "Join hands in covenant prayer now.",
                  url: "/space",
                }).catch(() => {});
              } else {
                // Partner B picked the call!
                // Update table status to connected
                await supabase
                  .from("prayer_calls")
                  .update({ status: "connected", updated_at: new Date().toISOString() })
                  .eq("couple_id", coupleId)
                  .eq("status", "calling");

                // Broadcast that partner picked call
                channel.send({
                  type: "broadcast",
                  event: "prayer_call_picked",
                  payload: { from: currentUserId },
                });
              }
            }
          });

        // 4. CALLER PERIODIC PULSE & PARTNER-PICKED POLLING
        let pulseTimer: NodeJS.Timeout | null = null;
        let pollTimer: NodeJS.Timeout | null = null;

        if (isCaller) {
          // Repeatedly pulse incoming alert every 2.5s while waiting
          pulseTimer = setInterval(() => {
            if (channelRef.current) {
              channelRef.current.send({
                type: "broadcast",
                event: "prayer_call_incoming",
                payload: {
                  callerId: currentUserId,
                  callerName: currentUserName,
                  callerAvatar: currentUserAvatar,
                },
              });
            }
          }, 2500);

          // Fast poll DB every 1.5s to detect if partner picked the call
          pollTimer = setInterval(async () => {
            if (!coupleId) return;
            try {
              const { data } = await supabase
                .from("prayer_calls")
                .select("status")
                .eq("couple_id", coupleId)
                .eq("caller_id", currentUserId)
                .order("created_at", { ascending: false })
                .limit(1)
                .maybeSingle();

              if (data?.status === "connected") {
                if (pollTimer) clearInterval(pollTimer);
                if (pulseTimer) clearInterval(pulseTimer);
                console.log("[WebRTC] Partner picked detected from DB! Sending offer...");
                ringtone.stopAll();
                ringtone.playConnectedSound();
                setCallState("picked");
                await sendOffer();
              }
            } catch (_) {}
          }, 1500);
        }

        cleanupIntervalsRef.current = () => {
          if (pulseTimer) clearInterval(pulseTimer);
          if (pollTimer) clearInterval(pollTimer);
        };
      } catch (err: any) {
        console.error("Prayer call init error:", err);
        ringtone.stopAll();
        setErrorMessage(
          err?.name === "NotAllowedError"
            ? "Microphone access was denied. Please allow microphone access to talk in prayer call."
            : "Could not initialize microphone. Please check your browser audio settings."
        );
      }
    }

    initWebRTC();

    return () => {
      isSubscribed = false;
      if (cleanupIntervalsRef.current) cleanupIntervalsRef.current();
      cleanupCall();
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [isOpen, coupleId, currentUserId, currentUserName, currentUserAvatar, isCaller, cleanupCall, onClose]);

  // Duration counter when connected
  React.useEffect(() => {
    if (callState === "connected") {
      durationTimerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (durationTimerRef.current) {
        clearInterval(durationTimerRef.current);
        durationTimerRef.current = null;
      }
    }
    return () => {
      if (durationTimerRef.current) {
        clearInterval(durationTimerRef.current);
      }
    };
  }, [callState]);

  if (!isOpen) return null;

  const myInitial = currentUserName ? currentUserName.charAt(0).toUpperCase() : "Y";
  const partnerInitial = partnerName ? partnerName.charAt(0).toUpperCase() : "P";

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[75] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-[#1A1A1E]/85 backdrop-blur-md"
        />

        {/* Hidden Remote Audio Element for playing partner's live voice */}
        <audio ref={remoteAudioRef} autoPlay playsInline />

        {/* Modal Card */}
        <motion.div
          initial={{ scale: 0.92, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.92, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 280 }}
          className="relative z-10 w-full max-w-[420px] rounded-[24px] bg-white border border-border p-6 shadow-2xl flex flex-col items-center text-center space-y-6 overflow-hidden"
        >
          {/* Soft blush ambient aura */}
          <div className="pointer-events-none absolute -top-20 -right-20 w-44 h-44 rounded-full bg-[#FFC2CE]/35 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -left-20 w-44 h-44 rounded-full bg-[#FF5A7E]/20 blur-3xl" />

          {/* Top Pill Tag */}
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFC2CE]/40 border border-primary/20 text-xs font-semibold text-primary">
              <Sparkles size={12} strokeWidth={2} />
              <span>Covenant Prayer Call</span>
            </span>
          </div>

          {/* Call Status & Headline */}
          <div className="space-y-1">
            <h2 className="font-heading text-2xl sm:text-3xl text-ink font-normal leading-snug">
              {callState === "connected"
                ? "United in Prayer"
                : callState === "picked"
                ? "Call Picked!"
                : callState === "ended"
                ? "Prayer Concluded"
                : `Calling ${partnerName}...`}
            </h2>

            <p className="text-xs text-inkSoft font-medium">
              {callState === "connected" ? (
                <span className="text-primary font-semibold tracking-wider text-sm flex items-center justify-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span>{formatSeconds(callDuration)} • Voice Live</span>
                </span>
              ) : callState === "picked" ? (
                <span className="text-primary font-semibold animate-pulse">
                  Connecting live audio...
                </span>
              ) : callState === "ended" ? (
                <span>God bless your prayer agreement.</span>
              ) : (
                <span className="animate-pulse">
                  Waiting for {partnerName} to pick...
                </span>
              )}
            </p>
          </div>

          {/* Avatars with Animated Halo & Live Wave */}
          <div className="relative my-4 flex items-center justify-center">
            {/* Pulsing ring animation */}
            <motion.div
              animate={{
                scale: callState === "connected" ? [1, 1.18, 1] : [1, 1.08, 1],
                opacity: [0.25, 0.65, 0.25],
              }}
              transition={{
                duration: callState === "connected" ? 2 : 2.5,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="absolute w-44 h-44 rounded-full bg-[#FFC2CE]/40"
            />

            {/* Overlapping Partners */}
            <div className="relative z-10 flex items-center -space-x-4">
              {/* Current User Avatar */}
              <div className="w-20 h-20 rounded-full border-4 border-white bg-blush/60 flex items-center justify-center text-xl font-heading font-medium text-ink shadow-lg overflow-hidden">
                {currentUserAvatar ? (
                  <Image
                    src={currentUserAvatar}
                    alt={currentUserName}
                    width={80}
                    height={80}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  myInitial
                )}
              </div>

              {/* Partner Avatar */}
              <div className="w-20 h-20 rounded-full border-4 border-white bg-primary text-white flex items-center justify-center text-xl font-heading font-medium shadow-lg overflow-hidden">
                {partnerAvatar ? (
                  <Image
                    src={partnerAvatar}
                    alt={partnerName}
                    width={80}
                    height={80}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  partnerInitial
                )}
              </div>
            </div>
          </div>

          {/* Scripture Prompt during call */}
          <div className="p-3.5 rounded-[18px] bg-canvas border border-border/80 text-center max-w-sm">
            <p className="text-xs text-ink italic leading-relaxed">
              &ldquo;Where two or three gather in my name, there am I with them.&rdquo;
            </p>
            <span className="text-[10px] text-inkSoft/80 block uppercase tracking-wider mt-1">
              — Matthew 18:20
            </span>
          </div>

          {/* Error notice if microphone denied */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs leading-snug">
              {errorMessage}
            </div>
          )}

          {/* CALL CONTROLS */}
          <div className="pt-2 flex items-center justify-center gap-6 w-full">
            {/* 1. Mute/Unmute toggle */}
            <button
              type="button"
              onClick={toggleMute}
              disabled={callState === "ended"}
              aria-label={isMuted ? "Unmute microphone" : "Mute microphone"}
              className={cn(
                "w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-md active:scale-95",
                isMuted
                  ? "bg-red-100 text-red-600 border border-red-200"
                  : "bg-canvas text-ink hover:text-primary border border-border"
              )}
            >
              {isMuted ? <MicOff size={20} strokeWidth={1.5} /> : <Mic size={20} strokeWidth={1.5} />}
            </button>

            {/* 2. End Call / Amen Button */}
            <button
              type="button"
              onClick={() => handleEndCall(true)}
              disabled={callState === "ended"}
              aria-label="End prayer call"
              className="h-12 px-6 rounded-full bg-[#E84367] hover:bg-deep text-white font-medium text-sm flex items-center space-x-2 shadow-[0_8px_32px_rgba(232,67,103,0.3)] active:scale-95 transition-all"
            >
              <PhoneOff size={18} strokeWidth={1.8} />
              <span>{callState === "connected" ? "Amen • End Call" : "End Call"}</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
