"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Heart, Sparkles, ShieldCheck, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Stage = "courting" | "engaged" | "married" | null;

interface StageOption {
  key: "courting" | "engaged" | "married";
  title: string;
  desc: string;
  icon: React.ElementType;
}

const STAGE_OPTIONS: StageOption[] = [
  {
    key: "courting",
    title: "Courting",
    desc: "Dating with intention",
    icon: Heart,
  },
  {
    key: "engaged",
    title: "Engaged",
    desc: "Preparing for forever",
    icon: Sparkles,
  },
  {
    key: "married",
    title: "Married",
    desc: "Building legacy",
    icon: ShieldCheck,
  },
];

export default function OnboardingStagePage() {
  const router = useRouter();
  const [selectedStage, setSelectedStage] = React.useState<Stage>(null);

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const savedStage = localStorage.getItem("stage") as Stage;
      if (savedStage === "courting" || savedStage === "engaged" || savedStage === "married") {
        setSelectedStage(savedStage);
      }
    }
  }, []);

  const handleSelect = (stage: "courting" | "engaged" | "married") => {
    setSelectedStage(stage);
    if (typeof window !== "undefined") {
      localStorage.setItem("stage", stage);
    }
  };

  const handleContinue = () => {
    if (selectedStage) {
      router.push("/onboarding/details");
    }
  };

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-canvas text-ink flex flex-col justify-between">
      {/* Background blob top left */}
      <div
        className="pointer-events-none absolute -top-20 -left-20 z-0 h-[400px] w-[400px] opacity-60 blur-[80px]"
        style={{
          backgroundImage: "url('/blob.svg')",
          backgroundSize: "contain",
          backgroundRepeat: "no-repeat",
        }}
      />

      {/* Main Content */}
      <main className="relative z-10 mx-auto w-full max-w-[480px] p-6 flex-1 flex flex-col">
        {/* Top Progress */}
        <div className="flex items-center justify-between pt-4 pb-8">
          <span className="text-xs font-semibold text-inkSoft tracking-widest uppercase">
            2/3
          </span>
          <div className="flex items-center space-x-1.5">
            <span className="h-1.5 w-6 rounded-full bg-primary" />
            <span className="h-1.5 w-6 rounded-full bg-primary" />
            <span className="h-1.5 w-6 rounded-full bg-border" />
          </div>
        </div>

        {/* Headlines */}
        <div className="mb-8">
          <h1 className="font-heading text-[24px] text-ink font-normal leading-tight">
            Your season?
          </h1>
          <p className="mt-1 font-body text-[14px] text-inkSoft">
            We tailor talks for this.
          </p>
        </div>

        {/* 3 Cards Vertical Stack */}
        <div className="flex flex-col space-y-4">
          {STAGE_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const isSelected = selectedStage === opt.key;

            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => handleSelect(opt.key)}
                className={cn(
                  "flex items-center justify-between p-5 rounded-[24px] text-left transition-all cursor-pointer select-none",
                  isSelected
                    ? "border-2 border-[#FF5A7E] bg-[#FFC2CE]/20 shadow-[0_8px_32px_rgba(255,90,126,0.08)]"
                    : "border border-[#F5E6E8] bg-white hover:border-[#FFC2CE]"
                )}
              >
                <div className="flex items-center space-x-4">
                  <div
                    className={cn(
                      "w-11 h-11 rounded-full flex items-center justify-center transition-colors",
                      isSelected ? "bg-primary text-white" : "bg-blush/40 text-ink"
                    )}
                  >
                    <Icon strokeWidth={1.5} size={20} />
                  </div>
                  <div>
                    <h2 className="font-heading text-[18px] text-ink font-normal leading-tight">
                      {opt.title}
                    </h2>
                    <p className="text-[13px] text-inkSoft mt-0.5">
                      {opt.desc}
                    </p>
                  </div>
                </div>

                <ChevronRight
                  strokeWidth={1.5}
                  size={20}
                  className={cn(
                    "transition-colors",
                    isSelected ? "text-primary" : "text-inkSoft/60"
                  )}
                />
              </button>
            );
          })}
        </div>
      </main>

      {/* Bottom Sticky Button */}
      <footer className="sticky bottom-0 left-0 right-0 z-20 p-6 bg-gradient-to-t from-canvas via-canvas/90 to-transparent">
        <div className="mx-auto w-full max-w-[480px]">
          <Button
            type="button"
            variant="primary"
            disabled={!selectedStage}
            onClick={handleContinue}
            className="w-full h-14 rounded-full text-base font-medium transition-all"
          >
            Continue
          </Button>
        </div>
      </footer>
    </div>
  );
}
