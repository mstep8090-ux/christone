"use client";

import * as React from "react";
import Image from "next/image";
import {
  Camera,
  Upload,
  RefreshCw,
  Check,
  X,
  Sparkles,
  Heart,
  Smile,
  Crown,
  Flame,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";

interface AvatarUploaderProps {
  userId: string;
  currentAvatarUrl?: string | null;
  displayName?: string;
  onAvatarUpdated: (newUrl: string) => void;
  size?: "sm" | "md" | "lg";
}

// Preset covenant icon avatars
const PRESET_ICONS = [
  { id: "hands", label: "Prayer Hands", icon: "🙏" },
  { id: "cross", label: "Faith Cross", icon: "✝️" },
  { id: "ring", label: "Covenant Ring", icon: "💍" },
  { id: "dove", label: "Peace Dove", icon: "🕊️" },
  { id: "crown", label: "Kingdom Crown", icon: "👑" },
  { id: "heart", label: "Pure Heart", icon: "🤍" },
  { id: "rose", label: "Rose", icon: "🌹" },
  { id: "flame", label: "Holy Flame", icon: "🔥" },
];

export function AvatarUploader({
  userId,
  currentAvatarUrl,
  displayName = "You",
  onAvatarUpdated,
  size = "lg",
}: AvatarUploaderProps) {
  const [avatarUrl, setAvatarUrl] = React.useState<string | null>(currentAvatarUrl || null);
  const [isUploading, setIsUploading] = React.useState(false);
  const [uploadSuccess, setUploadSuccess] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  // Live Camera state for desktop/webcam snap
  const [isCameraOpen, setIsCameraOpen] = React.useState(false);
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const streamRef = React.useRef<MediaStream | null>(null);

  // Hidden inputs for file upload and native mobile camera
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const mobileCameraInputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    if (currentAvatarUrl !== undefined) {
      setAvatarUrl(currentAvatarUrl);
    }
  }, [currentAvatarUrl]);

  // Image resizing helper (creates compact, crisp 400x400 JPEG)
  const resizeImage = (file: File | Blob): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = document.createElement("img");
      const reader = new FileReader();

      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };

      img.onload = () => {
        const canvas = document.createElement("canvas");
        const maxDim = 400;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(file);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else resolve(file);
          },
          "image/jpeg",
          0.88
        );
      };

      img.onerror = () => resolve(file);
      reader.onerror = () => resolve(file);
      reader.readAsDataURL(file);
    });
  };

  // Upload processed blob to Supabase Storage and update profile
  const handleUploadBlob = async (blob: Blob) => {
    if (!userId) {
      setErrorMessage("User account not loaded. Please try again.");
      return;
    }

    setIsUploading(true);
    setErrorMessage(null);
    setUploadSuccess(false);

    try {
      const fileName = `${userId}/${Date.now()}.jpg`;

      // 1. Upload to Supabase Storage 'avatars' bucket
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, blob, {
          contentType: "image/jpeg",
          upsert: true,
        });

      let publicUrl = "";

      if (uploadError) {
        console.warn("Storage upload note, trying moments bucket fallback:", uploadError);
        // Fallback to moments bucket if avatars had permission glitch
        const { error: fallbackError } = await supabase.storage
          .from("moments")
          .upload(`avatars/${fileName}`, blob, {
            contentType: "image/jpeg",
            upsert: true,
          });

        if (fallbackError) {
          throw new Error("Unable to upload image. Please try a smaller photo.");
        }

        const { data: urlData } = supabase.storage
          .from("moments")
          .getPublicUrl(`avatars/${fileName}`);
        publicUrl = urlData.publicUrl;
      } else {
        const { data: urlData } = supabase.storage
          .from("avatars")
          .getPublicUrl(fileName);
        publicUrl = urlData.publicUrl;
      }

      // 2. Update profiles table with new avatar_url
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", userId);

      if (profileError) {
        console.error("Profile update error:", profileError);
      }

      setAvatarUrl(publicUrl);
      onAvatarUpdated(publicUrl);
      setUploadSuccess(true);
      setTimeout(() => setUploadSuccess(false), 3000);
    } catch (err: any) {
      console.error("Avatar upload failed:", err);
      setErrorMessage(err.message || "Failed to upload photo. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  // File Input Handler
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setErrorMessage("Please select a valid image file (JPEG, PNG, WebP).");
      return;
    }

    try {
      const resizedBlob = await resizeImage(file);
      await handleUploadBlob(resizedBlob);
    } catch (err) {
      console.error("Image processing error:", err);
      setErrorMessage("Could not process image. Please try another photo.");
    } finally {
      e.target.value = "";
    }
  };

  // Open live webcam modal
  const startLiveCamera = async () => {
    setErrorMessage(null);
    setIsCameraOpen(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 640 }, facingMode: "user" },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      console.warn("Camera access failed:", err);
      setIsCameraOpen(false);
      // Fallback to mobile camera input
      if (mobileCameraInputRef.current) {
        mobileCameraInputRef.current.click();
      } else {
        setErrorMessage("Camera access was not permitted. You can choose a photo from your gallery.");
      }
    }
  };

  // Close live camera
  const stopLiveCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraOpen(false);
  };

  // Snap photo from live video feed
  const snapPhoto = async () => {
    if (!videoRef.current) return;

    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 480;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Flip horizontally for natural mirror selfie look
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(async (blob) => {
      stopLiveCamera();
      if (blob) {
        const resized = await resizeImage(blob);
        await handleUploadBlob(resized);
      }
    }, "image/jpeg", 0.9);
  };

  // Preset Icon selector
  const handleSelectPreset = async (emoji: string) => {
    // Generate an SVG data URI with the emoji centered on blush background
    const svgString = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#FFFBFC"/>
          <stop offset="100%" stop-color="#FFC2CE"/>
        </linearGradient>
      </defs>
      <rect width="200" height="200" rx="100" fill="url(#bg)"/>
      <text x="50%" y="58%" dominant-baseline="middle" text-anchor="middle" font-size="96">${emoji}</text>
    </svg>`;

    const dataUri = `data:image/svg+xml;utf8,${encodeURIComponent(svgString)}`;

    setIsUploading(true);
    setErrorMessage(null);

    try {
      // Update profile in DB
      await supabase
        .from("profiles")
        .update({ avatar_url: dataUri })
        .eq("id", userId);

      setAvatarUrl(dataUri);
      onAvatarUpdated(dataUri);
      setUploadSuccess(true);
      setTimeout(() => setUploadSuccess(false), 3000);
    } catch (err: any) {
      console.error("Preset avatar update error:", err);
      setErrorMessage("Could not update avatar. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const initial = displayName ? displayName.charAt(0).toUpperCase() : "Y";

  const sizeDimensions = {
    sm: "w-14 h-14 text-xl",
    md: "w-20 h-20 text-2xl",
    lg: "w-24 h-24 text-3xl",
  };

  return (
    <div className="space-y-4">
      {/* Hidden File & Camera Inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
      <input
        ref={mobileCameraInputRef}
        type="file"
        accept="image/*"
        capture="user"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Main Avatar Preview & Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center gap-5">
        {/* Avatar Circle with Pulsing Ring & Overlay */}
        <div className="relative group">
          <div
            className={`relative rounded-full border-4 border-white bg-gradient-to-br from-blush/40 to-primary/20 shadow-[0_8px_24px_rgba(255,90,126,0.15)] flex items-center justify-center font-heading font-normal text-ink overflow-hidden transition-transform active:scale-95 cursor-pointer ${sizeDimensions[size]}`}
            onClick={() => fileInputRef.current?.click()}
            title="Click to change profile picture"
          >
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt={displayName}
                width={120}
                height={120}
                className="w-full h-full object-cover"
                unoptimized={avatarUrl.startsWith("data:")}
              />
            ) : (
              <span>{initial}</span>
            )}

            {/* Hover Camera Icon Overlay */}
            <div className="absolute inset-0 bg-[#1A1A1E]/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
              <Camera size={20} strokeWidth={2} />
            </div>

            {/* Uploading Spinner */}
            {isUploading && (
              <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                <RefreshCw size={22} className="animate-spin text-primary" />
              </div>
            )}
          </div>

          {/* Camera mini badge */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-primary hover:bg-deep text-white border-2 border-white shadow-md flex items-center justify-center transition-transform active:scale-90"
            title="Change photo"
          >
            <Camera size={14} strokeWidth={2} />
          </button>
        </div>

        {/* Upload & Take Picture Buttons */}
        <div className="space-y-2 text-center sm:text-left flex-1">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
            {/* 1. UPLOAD IMAGE BUTTON */}
            <button
              type="button"
              disabled={isUploading}
              onClick={() => fileInputRef.current?.click()}
              className="h-9 px-3.5 rounded-full bg-white hover:bg-canvas border border-border text-ink text-xs font-medium shadow-xs flex items-center space-x-1.5 transition-all active:scale-95"
            >
              <Upload size={13} strokeWidth={1.8} className="text-primary" />
              <span>Upload Photo</span>
            </button>

            {/* 2. TAKE PICTURE BUTTON */}
            <button
              type="button"
              disabled={isUploading}
              onClick={startLiveCamera}
              className="h-9 px-3.5 rounded-full bg-primary hover:bg-deep text-white text-xs font-semibold shadow-xs flex items-center space-x-1.5 transition-all active:scale-95"
            >
              <Camera size={13} strokeWidth={2} />
              <span>Take Picture</span>
            </button>
          </div>

          <p className="text-[11px] text-inkSoft">
            JPG, PNG or selfie photo. Visible only to your partner.
          </p>

          {uploadSuccess && (
            <p className="text-[11px] font-semibold text-[#2C6E49] flex items-center justify-center sm:justify-start space-x-1">
              <Check size={13} strokeWidth={2.5} />
              <span>Profile picture updated!</span>
            </p>
          )}

          {errorMessage && (
            <p className="text-[11px] font-medium text-[#E84367]">{errorMessage}</p>
          )}
        </div>
      </div>

      {/* Preset Covenant Icons (One-Tap Avatars) */}
      <div className="pt-2 border-t border-border/60">
        <span className="text-[11px] font-semibold text-inkSoft uppercase tracking-wider block mb-2">
          Or pick a covenant avatar icon
        </span>
        <div className="flex flex-wrap gap-2">
          {PRESET_ICONS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => handleSelectPreset(preset.icon)}
              className="w-10 h-10 rounded-full bg-white hover:bg-blush/20 border border-border flex items-center justify-center text-lg transition-transform active:scale-90 shadow-xs hover:border-primary"
              title={preset.label}
            >
              {preset.icon}
            </button>
          ))}
        </div>
      </div>

      {/* LIVE CAMERA SNAP MODAL (For desktop webcam or in-app camera) */}
      {isCameraOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1A1A1E]/80 backdrop-blur-sm">
          <div className="w-full max-w-[360px] rounded-[24px] bg-white p-5 border border-border shadow-2xl flex flex-col items-center space-y-4">
            <div className="w-full flex items-center justify-between">
              <span className="font-heading text-xl text-ink font-normal">
                Take Profile Photo
              </span>
              <button
                type="button"
                onClick={stopLiveCamera}
                className="w-8 h-8 rounded-full bg-canvas text-inkSoft hover:text-ink flex items-center justify-center"
              >
                <X size={16} />
              </button>
            </div>

            {/* Video Feed Circle */}
            <div className="relative w-64 h-64 rounded-full overflow-hidden border-4 border-primary shadow-lg bg-black">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover transform -scale-x-100"
              />
            </div>

            {/* Controls */}
            <div className="w-full flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={stopLiveCamera}
                className="h-11 px-5 rounded-full bg-canvas text-ink hover:bg-border/60 border border-border text-xs font-medium"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={snapPhoto}
                className="h-11 px-6 rounded-full bg-primary hover:bg-deep text-white text-xs font-semibold flex items-center space-x-2 shadow-md active:scale-95"
              >
                <Camera size={15} strokeWidth={2} />
                <span>Snap Photo</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
