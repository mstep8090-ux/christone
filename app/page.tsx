import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Pill } from "@/components/ui/pill";

export default function HomePage() {
  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-canvas text-ink">
      {/* Background: blob.svg absolute top-right blurred 80px, opacity 0.6 */}
      <div
        className="pointer-events-none absolute -top-24 -right-24 z-0 h-[480px] w-[480px] opacity-60 blur-[80px]"
        style={{
          backgroundImage: "url('/blob.svg')",
          backgroundSize: "contain",
          backgroundRepeat: "no-repeat",
        }}
      />

      {/* Centered column max-w-[480px] for content */}
      <div className="relative z-10 mx-auto max-w-[480px] px-6">
        {/* SECTION 1: HERO */}
        <section className="pt-[80px] flex flex-col items-center text-center">
          <h1 className="font-heading text-[32px] leading-[1.1] text-ink font-normal tracking-tight max-w-[340px]">
            A private space for two.
          </h1>

          <p className="mt-4 font-body text-[16px] text-inkSoft leading-relaxed max-w-[320px]">
            Talk, pray, play. Built for kingdom couples.
          </p>

          <div className="mt-8 w-full max-w-[280px]">
            <Link href="/onboarding" className="block w-full">
              <Button variant="primary" className="w-full text-base font-medium">
                Create Our Space
              </Button>
            </Link>
          </div>

          <div className="mt-10 w-full flex justify-center">
            <Image
              src="/illustrations/hero-couple.svg"
              alt="Kingdom couple together"
              width={400}
              height={300}
              priority
              className="w-full max-w-[360px] h-auto object-contain"
            />
          </div>
        </section>

        {/* SECTION 2: 3 FEATURE CARDS */}
        <section className="mt-[80px] flex flex-col space-y-4">
          {/* Feature 1 */}
          <Card className="flex items-center space-x-4 p-5 rounded-[24px]">
            <div className="w-12 h-12 flex-shrink-0 rounded-full bg-blush/40 flex items-center justify-center">
              <Image
                src="/icons/message-circle.svg"
                alt="Talk Decks"
                width={24}
                height={24}
              />
            </div>
            <div className="flex-1 text-left">
              <h2 className="font-heading text-[20px] font-normal text-ink leading-tight">
                Talk Decks
              </h2>
              <p className="text-[13px] text-inkSoft mt-1">
                Guided prompts for honest connection.
              </p>
            </div>
          </Card>

          {/* Feature 2 */}
          <Card className="flex items-center space-x-4 p-5 rounded-[24px]">
            <div className="w-12 h-12 flex-shrink-0 rounded-full bg-blush/40 flex items-center justify-center">
              <Image
                src="/icons/praying-hands.svg"
                alt="Prayer Sync"
                width={24}
                height={24}
              />
            </div>
            <div className="flex-1 text-left">
              <h2 className="font-heading text-[20px] font-normal text-ink leading-tight">
                Prayer Sync
              </h2>
              <p className="text-[13px] text-inkSoft mt-1">
                Lift up requests together in real time.
              </p>
            </div>
          </Card>

          {/* Feature 3 */}
          <Card className="flex items-center space-x-4 p-5 rounded-[24px]">
            <div className="w-12 h-12 flex-shrink-0 rounded-full bg-blush/40 flex items-center justify-center">
              <Image
                src="/icons/gamepad.svg"
                alt="Games for Two"
                width={24}
                height={24}
              />
            </div>
            <div className="flex-1 text-left">
              <h2 className="font-heading text-[20px] font-normal text-ink leading-tight">
                Games for Two
              </h2>
              <p className="text-[13px] text-inkSoft mt-1">
                Playful quizzes and trivia made for pairs.
              </p>
            </div>
          </Card>
        </section>

        {/* SECTION 3: SOCIAL PROOF MINIMAL */}
        <section className="mt-[80px] flex justify-center text-center">
          <Pill className="text-center font-body text-sm py-2.5 px-6">
            For courting, engaged, married.
          </Pill>
        </section>

        {/* SECTION 4: PRICING TEASER */}
        <section className="mt-[80px] mb-[80px] text-center">
          <Card className="rounded-[24px] p-6 text-center">
            <p className="font-body text-[15px] font-medium text-ink">
              One subscription covers both. $7.99/mo
            </p>
            <div className="mt-4">
              <Link href="/onboarding">
                <Button variant="ghost" size="sm" className="text-xs">
                  Begin Free Trial
                </Button>
              </Link>
            </div>
          </Card>
        </section>
      </div>
    </div>
  );
}
