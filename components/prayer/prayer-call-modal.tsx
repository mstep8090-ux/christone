"use client";

import * as React from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, PhoneOff, PhoneCall, Volume2, Sparkles, Check, Heart, Shield } from "lucide-react";
import { Pill } from "@/components/ui/pill";
import { supabase } from "@/lib/supabase/client";
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
  const [callState, setCallState] = React.useState<"initiating" | "waiting" | "connected" | "ended">("initiating");
  const [isMuted, setIsMuted] = React.useState(false);
  const [callDuration, setCallDuration] = React.useState(0);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  // Audio stream references
  const localStreamRef = React.useRef<MediaStream | null>(null);
  const peerConnectionRef = React.useRef<RTCPeerConnection | null>(null);
  const remoteAudioRef = React.useRef<HTMLAudioElement | null>(null);
  const durationTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const channelRef = React.useRef<any>(null);

  // Clean up all media and peer connections
  const cleanupCall = React.useCallback(() => {
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
  }, []);

  // End Call handler
  const handleEndCall = React.useCallback(async (completedNormally = true) => {
    try {
      if (channelRef.current && coupleId) {
        channelRef.current.send({
          type: "broadcast",
          event: "prayer_call_end",
          payload: { endedBy: currentUserId },
        });
      }
    } catch (_) {}

    cleanupCall();
    setCallState("ended");

    if (completedNormally && callDuration >= 5 && onPrayerCompleted) {
      onPrayerCompleted();
    }

    setTimeout(() => {
      onClose();
    }, 1200);
  }, [channelRef, coupleId, currentUserId, cleanupCall, callDuration, onPrayerCompleted, onClose]);

  // Format seconds to mm:ss
  const formatSeconds = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

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

  // Setup WebRTC and Realtime Signaling
  React.useEffect(() => {
    if (!isOpen || !coupleId || !currentUserId) return;

    let isSubscribed = true;

    async function initAudioAndSignaling() {
      try {
        setErrorMessage(null);
        setCallState(isCaller ? "waiting" : "initiating");
        setCallDuration(0);

        // 1. Get microphone access
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        if (!isSubscribed) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        localStreamRef.current = stream;

        // 2. Initialize RTCPeerConnection
        const pc = new RTCPeerConnection(RTC_CONFIG);
        peerConnectionRef.current = pc;

        // Add local audio tracks to peer connection
        stream.getAudioTracks().forEach((track) => {
          pc.addTrack(track, stream);
        });

        // Play remote audio when track arrives
        pc.ontrack = (event) => {
          if (remoteAudioRef.current && event.streams[0]) {
            remoteAudioRef.current.srcObject = event.streams[0];
            remoteAudioRef.current.play().catch((err) => {
              console.warn("Autoplay audio note:", err);
            });
          }
          setCallState("connected");
        };

        // ICE Candidate handling
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
          if (pc.connectionState === "connected") {
            setCallState("connected");
          } else if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
            // keep waiting or handle reconnect
          }
        };

        // 3. Connect Supabase Realtime channel for signaling
        const channelName = `prayer_voice_${coupleId}`;
        const channel = supabase.channel(channelName, {
          config: { broadcast: { self: false } },
        });
        channelRef.current = channel;

        // Helper: create and send offer (from Caller)
        const sendOffer = async () => {
          if (!pc) return;
          try {
            const offer = await pc.createOffer();
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
            console.error("Error creating WebRTC offer:", err);
          }
        };

        channel
          .on("broadcast", { event: "prayer_call_joined" }, async (payload) => {
            if (isCaller && payload.payload.from !== currentUserId) {
              setCallState("connected");
              await sendOffer();
            }
          })
          .on("broadcast", { event: "webrtc_offer" }, async (payload) => {
            if (!isCaller && payload.payload.from !== currentUserId) {
              try {
                await pc.setRemoteDescription(new RTCSessionDescription(payload.payload.offer));
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
                setCallState("connected");
              } catch (err) {
                console.error("Error answering WebRTC offer:", err);
              }
            }
          })
          .on("broadcast", { event: "webrtc_answer" }, async (payload) => {
            if (isCaller && payload.payload.from !== currentUserId) {
              try {
                await pc.setRemoteDescription(new RTCSessionDescription(payload.payload.answer));
                setCallState("connected");
              } catch (err) {
                console.error("Error setting remote description:", err);
              }
            }
          })
          .on("broadcast", { event: "webrtc_ice" }, async (payload) => {
            if (payload.payload.from !== currentUserId && payload.payload.candidate) {
              try {
                await pc.addIceCandidate(new RTCIceCandidate(payload.payload.candidate));
              } catch (err) {
                console.warn("ICE candidate add warning:", err);
              }
            }
          })
          .on("broadcast", { event: "prayer_call_end" }, () => {
            cleanupCall();
            setCallState("ended");
            setTimeout(() => {
              onClose();
            }, 1000);
          })
          .subscribe(async (status) => {
            if (status === "SUBSCRIBED") {
              if (isCaller) {
                // Caller broadcasts call start
                channel.send({
                  type: "broadcast",
                  event: "prayer_call_incoming",
                  payload: {
                    callerId: currentUserId,
                    callerName: currentUserName,
                  },
                });

                // Also trigger native web push notification
                showWebNotification(`🙏 Prayer Call from ${currentUserName}`, {
                  body: "Join hands in covenant prayer now.",
                  url: "/pray?call=join",
                }).catch(() => {});
              } else {
                // Partner B notifies caller that they joined
                channel.send({
                  type: "broadcast",
                  event: "prayer_call_joined",
                  payload: { from: currentUserId },
                });
              }
            }
          });
      } catch (err: any) {
        console.error("Prayer call initialization error:", err);
        setErrorMessage(
          err?.name === "NotAllowedError"
            ? "Microphone permission was denied. Please allow microphone access in your browser settings."
            : "Could not access microphone for prayer call. Please try again."
        );
      }
    }

    initAudioAndSignaling();

    return () => {
      isSubscribed = false;
      cleanupCall();
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [isOpen, coupleId, currentUserId, currentUserName, isCaller, cleanupCall, onClose]);

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
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-[#1A1A1E]/85 backdrop-blur-md"
        />

        {/* Hidden Remote Audio Element */}
        <audio ref={remoteAudioRef} autoPlay playsInline />

        {/* Modal Card */}
        <motion.div
          initial={{ scale: 0.92, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.92, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 280 }}
          className="relative z-10 w-full max-w-[420px] rounded-[24px] bg-white border border-border p-6 shadow-2xl flex flex-col items-center text-center space-y-6 overflow-hidden"
        >
          {/* Subtle blush aura */}
          <div className="pointer-events-none absolute -top-20 -right-20 w-44 h-44 rounded-full bg-[#FFC2CE]/35 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -left-20 w-44 h-44 rounded-full bg-[#FF5A7E]/20 blur-3xl" />

          {/* Top Pill Tag */}
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFC2CE]/40 border border-primary/20 text-xs font-semibold text-primary">
              <Sparkles size={12} strokeWidth={2} />
              <span>Covenant Prayer Call</span>
            </span>
          </div>

          {/* Connected Duration or Calling Status */}
          <div className="space-y-1">
            <h2 className="font-heading text-2xl sm:text-3xl text-ink font-normal leading-snug">
              {callState === "connected"
                ? "United in Prayer"
                : callState === "ended"
                ? "Prayer Concluded"
                : `Calling ${partnerName}...`}
            </h2>
            <p className="text-xs text-inkSoft font-medium">
              {callState === "connected" ? (
                <span className="text-primary font-semibold tracking-wider text-sm">
                  {formatSeconds(callDuration)} • Audio Live
                </span>
              ) : callState === "ended" ? (
                <span>God bless your prayer agreement.</span>
              ) : (
                <span>Waiting for {partnerName} to connect...</span>
              )}
            </p>
          </div>

          {/* Avatars with Animated Halo */}
          <div className="relative my-4 flex items-center justify-center">
            {/* Pulsing ring animation */}
            <motion.div
              animate={{
                scale: callState === "connected" ? [1, 1.15, 1] : [1, 1.08, 1],
                opacity: [0.25, 0.6, 0.25],
              }}
              transition={{
                duration: callState === "connected" ? 2.5 : 2,
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
