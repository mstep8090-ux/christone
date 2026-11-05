import { supabase } from "@/lib/supabase/client";

/**
 * Compresses an image file in-browser using HTML5 Canvas.
 * Produces both an optimized Blob and a guaranteed Base64 Data URL fallback.
 */
export async function compressImage(
  file: File,
  maxWidth = 1200,
  maxHeight = 1200,
  quality = 0.85
): Promise<{ blob: Blob; dataUrl: string }> {
  return new Promise((resolve, reject) => {
    // If running server-side or non-image
    if (typeof window === "undefined" || !file.type.startsWith("image/")) {
      return reject(new Error("Invalid image or non-browser environment"));
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read image file"));
    reader.onload = (readerEvent) => {
      const img = new Image();
      img.onerror = () => reject(new Error("Failed to load image"));
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          return reject(new Error("Failed to get canvas 2D context"));
        }

        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL("image/jpeg", quality);
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve({ blob, dataUrl });
            } else {
              resolve({ blob: file, dataUrl });
            }
          },
          "image/jpeg",
          quality
        );
      };
      img.src = readerEvent.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Converts a Blob (e.g. recorded audio) to a Base64 Data URL.
 */
export async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Robust image upload helper:
 * Compresses the image, attempts Supabase Storage upload,
 * and if storage fails or RLS blocks it, falls back to the compressed Data URL.
 * Guarantees the image NEVER displays broken.
 */
export async function uploadImageSafe(
  file: File,
  bucket = "moments",
  folder = "photos"
): Promise<{ url: string; isFallback: boolean }> {
  try {
    const { blob, dataUrl } = await compressImage(file, 1200, 1200, 0.85);

    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.jpg`;
    const filePath = `${folder}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, blob, {
        contentType: "image/jpeg",
        upsert: true,
      });

    if (uploadError) {
      console.warn("Supabase Storage image upload failed, using high-res compressed DataURL:", uploadError);
      return { url: dataUrl, isFallback: true };
    }

    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);

    if (urlData?.publicUrl) {
      return { url: urlData.publicUrl, isFallback: false };
    }

    return { url: dataUrl, isFallback: true };
  } catch (err) {
    console.warn("Error in uploadImageSafe:", err);
    // Absolute fallback: read raw file as data URL
    const rawDataUrl = await blobToDataUrl(file);
    return { url: rawDataUrl, isFallback: true };
  }
}

/**
 * Robust audio/voice note upload helper:
 * Attempts Supabase Storage upload, falls back to Base64 Data URL.
 */
export async function uploadAudioSafe(
  audioBlob: Blob,
  bucket = "moments",
  folder = "voice"
): Promise<{ url: string; isFallback: boolean }> {
  try {
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.webm`;
    const filePath = `${folder}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, audioBlob, {
        contentType: "audio/webm",
        upsert: true,
      });

    if (uploadError) {
      console.warn("Supabase Storage audio upload failed, using DataURL fallback:", uploadError);
      const dataUrl = await blobToDataUrl(audioBlob);
      return { url: dataUrl, isFallback: true };
    }

    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);

    if (urlData?.publicUrl) {
      return { url: urlData.publicUrl, isFallback: false };
    }

    const dataUrl = await blobToDataUrl(audioBlob);
    return { url: dataUrl, isFallback: true };
  } catch (err) {
    console.warn("Error in uploadAudioSafe:", err);
    const dataUrl = await blobToDataUrl(audioBlob);
    return { url: dataUrl, isFallback: true };
  }
}
