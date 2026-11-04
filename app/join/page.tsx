"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, HeartHandshake, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function JoinEntryPage() {
  const router = useRouter();
  const [code, setCode] = React.useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = code.trim().toUpperCase();
    if (cleanCode.length >= 4) {
      router.push(`/join/${cleanCode}`);
    }
  };

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-canvas text-ink py-12 px-6 flex flex-col justify-between font-body">
      {/* Background blur blob */}
      <div
        className="pointer-events-none absolute -top-24 -right-24 z-0 h-[450px] w-[450px] opacity-60 blur-[80px]"
        style={{
          backgroundImage: "url('/blob.svg')",
          backgroundSize: "contain",
          backgroundRepeat: "no-repeat",
        }}
      />

      <main className="relative z-10 mx-auto w-full max-w-[480px] flex-1 flex flex-col justify-center">
        {/* Back Link */}
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center space-x-2 text-xs font-medium text-inkSoft hover:text-ink transition-colors"
          >
            <ArrowLeft size={16} strokeWidth={1.5} />
            <span>Home</span>
          </Link>
        </div>

        <Card className="p-7 sm:p-8 rounded-[24px] bg-white border border-border shadow-[0_8px_32px_rgba(255,90,126,0.08)] space-y-6">
          <div className="text-center space-y-2">
            <div className="mx-auto w-12 h-12 rounded-full bg-blush/40 flex items-center justify-center text-primary mb-3">
              <HeartHandshake size={22} strokeWidth={1.5} />
            </div>
            <h1 className="font-heading text-3xl text-ink font-normal leading-tight">
              Enter Partner Invite Code
            </h1>
            <p className="text-xs text-inkSoft">
              Paste or type the 6-character code your partner shared with you.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-ink block">Invite Code</label>
              <Input
                type="text"
                placeholder="e.g. A7K9P2"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                required
                maxLength={10}
                className="h-14 text-center font-mono text-xl tracking-widest uppercase"
                autoFocus
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              disabled={code.trim().length < 4}
              className="w-full h-12 rounded-full text-sm font-medium shadow-[0_8px_32px_rgba(255,90,126,0.18)] active:scale-[0.98] transition-all flex items-center justify-center space-x-2"
            >
              <span>Continue to Space</span>
              <ArrowRight size={16} />
            </Button>
          </form>

          <div className="pt-2 border-t border-border/70 text-center text-xs space-y-2">
            <p className="text-inkSoft">
              Already have an account?{" "}
              <Link href="/login" className="text-primary font-semibold hover:underline">
                Sign In
              </Link>
            </p>
            <p className="text-inkSoft">
              Starting a new couple space?{" "}
              <Link href="/onboarding" className="text-ink font-semibold hover:underline">
                Create Our Space
              </Link>
            </p>
          </div>
        </Card>
      </main>

      <footer className="relative z-10 text-center py-6 text-xs text-inkSoft">
        <p>Private, encrypted, and Christ-honoring space.</p>
      </footer>
    </div>
  );
}
