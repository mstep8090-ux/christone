import { supabase } from "@/lib/supabase/client";

/**
 * Register service worker if supported
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return null;
  }
  try {
    const registration = await navigator.serviceWorker.register("/sw.js");
    return registration;
  } catch (err) {
    console.warn("ServiceWorker registration failed:", err);
    return null;
  }
}

/**
 * Request native browser notification permission
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "denied";
  }
  if (Notification.permission === "granted") {
    return "granted";
  }
  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (err) {
    console.error("Failed to request notification permission:", err);
    return "denied";
  }
}

/**
 * Check if notifications are allowed
 */
export function isNotificationSupportedAndGranted(): boolean {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return false;
  }
  return Notification.permission === "granted";
}

/**
 * Display native browser notification
 */
export async function showWebNotification(
  title: string,
  options?: {
    body?: string;
    icon?: string;
    tag?: string;
    url?: string;
    data?: any;
  }
): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return false;
  }

  if (Notification.permission !== "granted") {
    const perm = await requestNotificationPermission();
    if (perm !== "granted") return false;
  }

  const notificationOptions = {
    body: options?.body || "",
    icon: options?.icon || "/illustrations/prayer-hands.svg",
    badge: "/illustrations/prayer-hands.svg",
    tag: options?.tag || "christone-notification",
    data: { url: options?.url || "/space", ...(options?.data || {}) },
  };

  try {
    if ("serviceWorker" in navigator) {
      const reg = await navigator.serviceWorker.ready;
      if (reg && reg.showNotification) {
        await reg.showNotification(title, notificationOptions);
        return true;
      }
    }
    const notif = new Notification(title, notificationOptions);
    if (options?.url) {
      notif.onclick = () => {
        window.focus();
        window.location.href = options.url!;
      };
    }
    return true;
  } catch (err) {
    console.warn("Direct Notification fallback:", err);
    try {
      new Notification(title, {
        body: options?.body,
        icon: options?.icon || "/illustrations/prayer-hands.svg",
      });
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Save notification to database and broadcast to partner
 */
export async function sendCoupleNotification({
  coupleId,
  recipientId,
  type,
  title,
  body,
  url,
}: {
  coupleId: string;
  recipientId: string;
  type: "daily_talk" | "prayer" | "streak_at_risk" | "nudge";
  title: string;
  body?: string;
  url?: string;
}) {
  if (!coupleId || !recipientId) return;

  try {
    // 1. Insert into database
    await supabase.from("notifications").insert({
      couple_id: coupleId,
      user_id: recipientId,
      type,
      title,
      read: false,
    });

    // 2. Broadcast realtime event
    const channel = supabase.channel(`realtime-notifications-${coupleId}-${recipientId}`);
    channel.send({
      type: "broadcast",
      event: "new_notification",
      payload: {
        type,
        title,
        body,
        url,
      },
    });
  } catch (err) {
    console.error("Failed to send couple notification:", err);
  }
}
