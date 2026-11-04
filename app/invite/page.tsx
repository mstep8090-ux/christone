"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { Copy, Check, Share2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/lib/supabase/client";

export default function InvitePage() {
  const router = useRouter();
  const [inviteCode, setInviteCode] = React.useState<string>("A7K9P2");
  const [copied, setCopied] = React.useState(false);
  const [partnerJoined, setPartnerJoined] = React.useState(false);
  const [origin, setOrigin] = React.useState<string>("");

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }

    async function checkCoupleAndListen() {
      try {
        const { data: authData } = await supabase.auth.getUser();
        const user = authData?.user;

        if (!user) {
          router.replace("/login");
          return;
        }

        // 1. Check if user already has a paired couple
        const { data: couples, error } = await supabase
          .from("couples")
          .select("id, status, invite_code, partner_a, partner_b")
          .or(`partner_a.eq.${user.id},partner_b.eq.${user.id}`)
          .order("created_at", { ascending: false });

        if (error) {
          console.error("Error loading couple in invite:", error);
        }

        // If any couple is paired, redirect immediately to /space!
        const paired = couples?.find((c) => c.status === "paired" || Boolean(c.partner_b));
        if (paired) {
          setPartnerJoined(true);
          router.replace("/space");
          return;
        }

        // Find active pending couple
        const pending = couples?.find((c) => c.status === "pending");
        if (pending) {
          if (pending.invite_code) {
            setInviteCode(pending.invite_code.toUpperCase());
            if (typeof window !== "undefined") {
              localStorage.setItem("partner_code", pending.invite_code.toUpperCase());
            }
          }

          // 2. Realtime listener: watch for partner joining this space
          const channel = supabase
            .channel(`invite-sync-${pending.id}`)
            .on(
              "postgres_changes",
              {
                event: "UPDATE",
                schema: "public",
                table: "couples",
                filter: `id=eq.${pending.id}`,
              },
              (payload) => {
                const updated = payload.new as any;
                if (updated && (updated.status === "paired" || updated.partner_b)) {
                  setPartnerJoined(true);
                  setTimeout(() => {
                    router.replace("/space");
                  }, 1200);
                }
              }
            )
            .subscribe();

          // 3. Fallback interval check every 2.5 seconds
          const interval = setInterval(async () => {
            const { data: latest } = await supabase
              .from("couples")
              .select("status, partner_b")
              .eq("id", pending.id)
              .maybeSingle();

            if (latest && (latest.status === "paired" || latest.partner_b)) {
              setPartnerJoined(true);
              clearInterval(interval);
              router.replace("/space");
            }
          }, 2500);

          return () => {
            supabase.removeChannel(channel);
            clearInterval(interval);
          };
        } else {
          // Check localStorage fallback
          if (typeof window !== "undefined") {
            const stored = localStorage.getItem("partner_code");
            if (stored) setInviteCode(stored.toUpperCase());
          }
        }
      } catch (err) {
        console.error("Invite init error:", err);
      }
    }

    const cleanupPromise = checkCoupleAndListen();
    return () => {
      cleanupPromise.then((cleanup) => {
        if (typeof cleanup === "function") cleanup();
      });
    };
  }, [router]);

  const joinUrl = origin
    ? `${origin}/join/${inviteCode}`
    : `https://christone.app/join/${inviteCode}`;

  const handleShareWhatsApp = () => {
    const message = `I created our private space on Christone Couples. Join with code ${inviteCode} - christone.xyz/join/${inviteCode}`;
    const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error("Failed to copy link:", err);
    }
  };

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-canvas text-ink py-12 px-6">
      {/* Background blur blob */}
      <div
        className="pointer-events-none absolute -top-24 -right-24 z-0 h-[450px] w-[450px] opacity-60 blur-[80px]"
        style={{
          backgroundImage: "url('/blob.svg')",
          backgroundSize: "contain",
          backgroundRepeat: "no-repeat",
        }}
      />

      <main className="relative z-10 mx-auto max-w-[480px] flex flex-col items-center text-center">
        {/* Partner Connected Alert */}
        {partnerJoined && (
          <div className="w-full mb-6 p-4 rounded-[20px] bg-[#DDF2E6] border border-[#BCE7CE] text-center space-y-1 text-[#2C6E49] shadow-sm animate-pulse">
            <Sparkles size={22} className="mx-auto text-[#2C6E49]" />
            <p className="text-sm font-semibold">Your partner has joined!</p>
            <p className="text-xs">Entering your private space...</p>
          </div>
        )}

        {/* Header */}
        <header className="mb-8 space-y-2">
          <h1 className="font-heading text-[32px] text-ink font-normal leading-tight">
            Your space is ready.
          </h1>
          <p className="font-body text-[16px] text-inkSoft">
            Invite your partner to unlock it.
          </p>
        </header>

        {/* Center Card with Invite Code & QR */}
        <Card className="w-full rounded-[24px] p-6 bg-white border border-border shadow-[0_8px_32px_rgba(255,90,126,0.08)] flex flex-col items-center mb-8">
          <span className="text-[12px] uppercase font-semibold text-inkSoft tracking-widest mb-3">
            Your Partner Code
          </span>

          {/* Large 32px Letter Spacing 8px Bold Uppercase Code */}
          <div className="py-2 px-6 rounded-full bg-blush/20 border border-border mb-6">
            <span className="font-heading text-[32px] tracking-[8px] font-bold text-primary select-all">
              {inviteCode}
            </span>
          </div>

          {/* QR Code */}
          <div className="p-4 rounded-[20px] bg-white border border-border shadow-sm mb-4">
            <QRCodeSVG
              value={joinUrl}
              size={148}
              bgColor="#FFFFFF"
              fgColor="#1A1A1E"
              level="M"
              includeMargin={false}
            />
          </div>

          <p className="text-[12px] text-inkSoft tracking-tight">
            Scan to join instantly
          </p>
        </Card>

        {/* 2 Buttons */}
        <div className="w-full flex flex-col space-y-3 mb-16">
          <Button
            type="button"
            variant="primary"
            onClick={handleShareWhatsApp}
            className="w-full h-14 rounded-full text-base font-medium flex items-center justify-center space-x-2"
          >
            <Share2 size={18} strokeWidth={1.5} />
            <span>Share on WhatsApp</span>
          </Button>

          <Button
            type="button"
            variant="secondary"
            onClick={handleCopyLink}
            className="w-full h-14 rounded-full text-base font-medium flex items-center justify-center space-x-2"
          >
            {copied ? (
              <>
                <Check size={18} strokeWidth={1.5} className="text-primary" />
                <span>Link Copied!</span>
              </>
            ) : (
              <>
                <Copy size={18} strokeWidth={1.5} />
                <span>Copy Link</span>
              </>
            )}
          </Button>
        </div>

        {/* Below: Preview Locked State */}
        <section className="relative w-full">
          <div className="relative rounded-[24px] overflow-hidden border border-border bg-white p-4">
            {/* 3 Blurred Cards */}
            <div className="flex flex-col space-y-3 filter blur-[3px] select-none pointer-events-none opacity-60">
              <div className="p-4 rounded-[18px] bg-canvas border border-border flex items-center justify-between">
                <span className="font-heading text-lg text-ink">Talk Decks</span>
                <span className="text-xs text-inkSoft">120+ Intimate Cards</span>
              </div>
              <div className="p-4 rounded-[18px] bg-canvas border border-border flex items-center justify-between">
                <span className="font-heading text-lg text-ink">Daily Games</span>
                <span className="text-xs text-inkSoft">Guess Partner's Answer</span>
              </div>
              <div className="p-4 rounded-[18px] bg-canvas border border-border flex items-center justify-between">
                <span className="font-heading text-lg text-ink">Prayer Sync</span>
                <span className="text-xs text-inkSoft">Shared Weekly Petitions</span>
              </div>
            </div>

            {/* Lock Overlay */}
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-6 bg-white/70 backdrop-blur-[2px] text-center">
              <div className="mb-3">
                <Image
                  src="/illustrations/lock-heart.svg"
                  alt="Locked Space"
                  width={48}
                  height={48}
                  className="opacity-80"
                />
              </div>
              <p className="font-body text-[14px] text-ink font-medium max-w-[260px] leading-snug">
                Talks, Games, Prayer - unlocks when partner joins
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
