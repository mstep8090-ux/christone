import * as React from "react";
import Link from "next/link";
import { ArrowLeft, ShieldCheck, HeartHandshake } from "lucide-react";
import { Card } from "@/components/ui/card";

export const metadata = {
  title: "Terms of Service - Christone Couples",
  description: "Terms and covenant guidelines for Christone Couples.",
};

export default function TermsPage() {
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
            <HeartHandshake size={12} strokeWidth={1.5} />
            <span>Covenant Space</span>
          </div>
          <h1 className="font-heading text-3xl sm:text-4xl text-ink font-normal leading-tight">
            Terms of Service
          </h1>
          <p className="text-xs text-inkSoft">
            Simple, honest commitments for kingdom couples.
          </p>
        </header>

        {/* Content Cards */}
        <div className="space-y-4">
          {/* 1. Covenant Integrity & 18+ */}
          <Card className="rounded-[24px] bg-white border border-border p-6 shadow-[0_8px_32px_rgba(255,90,126,0.06)] space-y-2.5">
            <h2 className="font-heading text-xl text-ink font-normal">
              Sacred Covenant Respect
            </h2>
            <p className="text-xs text-inkSoft leading-relaxed">
              Christone Couples is designed for dating, engaged, and married adults aged 18 and older. By joining, you commit to honoring your partner, fostering emotional safety, and engaging in respectful, consensual communication.
            </p>
          </Card>

          {/* 2. Married Intimacy & Consent */}
          <Card className="rounded-[24px] bg-white border border-border p-6 shadow-[0_8px_32px_rgba(255,90,126,0.06)] space-y-2.5">
            <h2 className="font-heading text-xl text-ink font-normal">
              Consensual Intimacy Talks
            </h2>
            <p className="text-xs text-inkSoft leading-relaxed">
              Intimacy-themed conversations are strictly non-graphic, Christ-honoring, and gated exclusively for married couples who have mutually confirmed consent. Any question can be skipped at any moment with no penalty.
            </p>
          </Card>

          {/* 3. Not Medical Advice */}
          <Card className="rounded-[24px] bg-white border border-border p-6 shadow-[0_8px_32px_rgba(255,90,126,0.06)] space-y-2.5">
            <h2 className="font-heading text-xl text-ink font-normal">
              Educational & Spiritual Resource
            </h2>
            <p className="text-xs text-inkSoft leading-relaxed">
              All tools, prompts, check-ins, and scriptures are for relationship enrichment and spiritual encouragement. They do not constitute professional therapy, psychological intervention, or medical advice.
            </p>
          </Card>

          {/* 4. One Sub Covers Both */}
          <Card className="rounded-[24px] bg-white border border-border p-6 shadow-[0_8px_32px_rgba(255,90,126,0.06)] space-y-2.5">
            <h2 className="font-heading text-xl text-ink font-normal">
              One Subscription Covers Both
            </h2>
            <p className="text-xs text-inkSoft leading-relaxed">
              Christone Premium is billed to one partner and unlocks the complete experience for both partners automatically. Subscriptions renew monthly or annually via Paystack and can be canceled anytime from settings.
            </p>
          </Card>
        </div>

        {/* Footer */}
        <div className="pt-4 text-center">
          <Link
            href="/privacy"
            className="text-xs text-primary font-medium hover:underline"
          >
            Review Privacy Policy &rarr;
          </Link>
        </div>
      </div>
    </main>
  );
}
