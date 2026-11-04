import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Shield, Lock } from "lucide-react";
import { Card } from "@/components/ui/card";

export const metadata = {
  title: "Privacy Policy - Christone Couples",
  description: "Private, encrypted, Christ-honoring space for two.",
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-canvas text-ink py-10 px-6 font-body">
      <div className="mx-auto max-w-[480px] space-y-6">
        {/* Back Link */}
        <Link
          href="/settings"
          className="inline-flex items-center space-x-2 text-xs font-medium text-inkSoft hover:text-ink transition-colors"
        >
          <ArrowLeft size={16} strokeWidth={1.5} />
          <span>Back</span>
        </Link>

        {/* Header */}
        <header className="space-y-2">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-[#FFC2CE]/40 text-primary text-[10px] font-semibold uppercase tracking-wider">
            <Shield size={12} strokeWidth={1.5} />
            <span>Sacred Trust</span>
          </div>
          <h1 className="font-heading text-3xl sm:text-4xl text-ink font-normal leading-tight">
            Your Privacy First
          </h1>
          <p className="text-xs text-inkSoft">
            Last updated November 2026. Designed exclusively for two.
          </p>
        </header>

        {/* Content Cards */}
        <div className="space-y-4">
          {/* 1. Private & Encrypted */}
          <Card className="rounded-[24px] bg-white border border-border p-6 shadow-[0_8px_32px_rgba(255,90,126,0.06)] space-y-2.5">
            <h2 className="font-heading text-xl text-ink font-normal">
              Private and Encrypted
            </h2>
            <p className="text-xs text-inkSoft leading-relaxed">
              Christone is built as a closed covenant room. Your reflections, prayers, moments, and answers are protected with encrypted transmission and isolated database row-level security. No public feeds, no followers, no external eyes.
            </p>
          </Card>

          {/* 2. 18+ and Married Intimacy */}
          <Card className="rounded-[24px] bg-white border border-border p-6 shadow-[0_8px_32px_rgba(255,90,126,0.06)] space-y-2.5">
            <h2 className="font-heading text-xl text-ink font-normal">
              Consensual Married Intimacy
            </h2>
            <p className="text-xs text-inkSoft leading-relaxed">
              Christone is strictly intended for individuals 18 years of age or older. Our intimacy talks are locked behind a voluntary marriage gate. All content is non-graphic, Christ-honoring, and completely skippable with mutual consent.
            </p>
          </Card>

          {/* 3. Not Medical Advice */}
          <Card className="rounded-[24px] bg-white border border-border p-6 shadow-[0_8px_32px_rgba(255,90,126,0.06)] space-y-2.5">
            <h2 className="font-heading text-xl text-ink font-normal">
              Not Medical Advice
            </h2>
            <p className="text-xs text-inkSoft leading-relaxed">
              Christone Couples is an emotional and spiritual companionship tool. Prompts, prayers, and insights are not medical advice, psychotherapy, clinical counseling, or psychiatric treatment.
            </p>
          </Card>

          {/* 4. Zero Ad Tracking */}
          <Card className="rounded-[24px] bg-white border border-border p-6 shadow-[0_8px_32px_rgba(255,90,126,0.06)] space-y-2.5">
            <h2 className="font-heading text-xl text-ink font-normal">
              Zero Data Monetization
            </h2>
            <p className="text-xs text-inkSoft leading-relaxed">
              We never sell your personal data or couple history to third parties or advertising networks. Our business is supported solely by transparent premium memberships.
            </p>
          </Card>
        </div>

        {/* Footer */}
        <div className="pt-4 text-center">
          <Link
            href="/terms"
            className="text-xs text-primary font-medium hover:underline"
          >
            Review Terms of Service &rarr;
          </Link>
        </div>
      </div>
    </main>
  );
}
