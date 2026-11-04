"use client";

import * as React from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Pill } from "@/components/ui/pill";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { BottomNav, type TabKey } from "@/components/ui/bottom-nav";

export default function DesignSystemPage() {
  const [activeTab, setActiveTab] = React.useState<TabKey>("space");
  const [inputValue, setInputValue] = React.useState("");

  return (
    <div className="relative min-h-screen bg-canvas text-ink pb-32">
      {/* Subtle organic blush blob background */}
      <div
        className="pointer-events-none absolute inset-0 z-0 opacity-40 bg-top bg-no-repeat"
        style={{ backgroundImage: "url('/blob.svg')", backgroundSize: "600px 600px" }}
      />

      {/* Mobile-first centered column */}
      <main className="relative z-10 mx-auto max-w-[480px] px-6 py-12 flex flex-col space-y-16">
        {/* Header */}
        <header className="space-y-2">
          <Pill>Design System</Pill>
          <h1 className="text-4xl text-ink font-normal tracking-tight pt-2">
            Christone UI Kit
          </h1>
          <p className="text-sm text-inkSoft">
            Minimalist components for Christian couples.
          </p>
        </header>

        {/* Buttons Section */}
        <section className="space-y-4">
          <h2 className="text-2xl text-ink font-normal">Button Variants</h2>
          <div className="flex flex-col space-y-3">
            <Button variant="primary">Primary Rose Action</Button>
            <Button variant="secondary">Secondary Blush Action</Button>
            <Button variant="ghost">Ghost Border Action</Button>
          </div>
        </section>

        {/* Pills Section */}
        <section className="space-y-4">
          <h2 className="text-2xl text-ink font-normal">Pills</h2>
          <div className="flex flex-wrap gap-2">
            <Pill>Dating</Pill>
            <Pill active>Engaged</Pill>
            <Pill>Married</Pill>
            <Pill>Daily Verse</Pill>
          </div>
        </section>

        {/* Inputs Section */}
        <section className="space-y-4">
          <h2 className="text-2xl text-ink font-normal">Input Fields</h2>
          <div className="space-y-3">
            <Input
              type="text"
              placeholder="Partner invite code"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
            />
            <Input
              type="email"
              placeholder="name@christone.app"
              readOnly
              value="couple@christone.app"
            />
          </div>
        </section>

        {/* Cards Section */}
        <section className="space-y-4">
          <h2 className="text-2xl text-ink font-normal">Cards</h2>
          <Card>
            <CardHeader>
              <CardTitle>Daily Question</CardTitle>
              <CardDescription>Share your reflections today.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-inkSoft leading-relaxed">
                What prayer can we lift up together this evening?
              </p>
            </CardContent>
            <CardFooter className="justify-between">
              <Pill>Today</Pill>
              <Button variant="primary" size="sm">
                Answer Together
              </Button>
            </CardFooter>
          </Card>
        </section>

        {/* Minimal Line Icons Section */}
        <section className="space-y-4">
          <h2 className="text-2xl text-ink font-normal">Line Icons</h2>
          <div className="grid grid-cols-4 gap-3">
            <div className="flex flex-col items-center justify-center p-3 bg-white rounded-[24px] border border-border shadow-[0_8px_32px_rgba(255,90,126,0.08)]">
              <Image
                src="/icons/heart.svg"
                alt="Heart icon"
                width={32}
                height={32}
              />
              <span className="text-[11px] text-inkSoft mt-2">Heart</span>
            </div>
            <div className="flex flex-col items-center justify-center p-3 bg-white rounded-[24px] border border-border shadow-[0_8px_32px_rgba(255,90,126,0.08)]">
              <Image
                src="/icons/message-circle.svg"
                alt="Message icon"
                width={32}
                height={32}
              />
              <span className="text-[11px] text-inkSoft mt-2">Talks</span>
            </div>
            <div className="flex flex-col items-center justify-center p-3 bg-white rounded-[24px] border border-border shadow-[0_8px_32px_rgba(255,90,126,0.08)]">
              <Image
                src="/icons/gamepad.svg"
                alt="Gamepad icon"
                width={32}
                height={32}
              />
              <span className="text-[11px] text-inkSoft mt-2">Games</span>
            </div>
            <div className="flex flex-col items-center justify-center p-3 bg-white rounded-[24px] border border-border shadow-[0_8px_32px_rgba(255,90,126,0.08)]">
              <Image
                src="/icons/praying-hands.svg"
                alt="Praying hands icon"
                width={32}
                height={32}
              />
              <span className="text-[11px] text-inkSoft mt-2">Pray</span>
            </div>
          </div>
        </section>

        {/* Empty State Section */}
        <section className="space-y-4">
          <h2 className="text-2xl text-ink font-normal">Empty State</h2>
          <div className="bg-white rounded-[24px] border border-border shadow-[0_8px_32px_rgba(255,90,126,0.08)]">
            <EmptyState
              headline="No Moments Yet"
              subtext="Begin your journey together by answering your first daily question."
              actionLabel="Start Daily Question"
            />
          </div>
        </section>
      </main>

      {/* Fixed Bottom Navigation */}
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}
