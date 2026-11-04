"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Role = "lady" | "guy" | null;

export default function OnboardingStep1Page() {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = React.useState<Role>(null);

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const savedRole = localStorage.getItem("role") as Role;
      if (savedRole === "lady" || savedRole === "guy") {
        setSelectedRole(savedRole);
      }
    }
  }, []);

  const handleSelect = (role: "lady" | "guy") => {
    setSelectedRole(role);
    if (typeof window !== "undefined") {
      localStorage.setItem("role", role);
    }
  };

  const handleContinue = () => {
    if (selectedRole) {
      router.push("/onboarding/stage");
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

      {/* Main Centered Container */}
      <main className="relative z-10 mx-auto w-full max-w-[480px] p-6 flex-1 flex flex-col">
        {/* Top Progress */}
        <div className="flex items-center justify-between pt-4 pb-8">
          <span className="text-xs font-semibold text-inkSoft tracking-widest uppercase">
            1/3
          </span>
          <div className="flex items-center space-x-1.5">
            <span className="h-1.5 w-6 rounded-full bg-primary" />
            <span className="h-1.5 w-6 rounded-full bg-border" />
            <span className="h-1.5 w-6 rounded-full bg-border" />
          </div>
        </div>

        {/* Headline */}
        <div className="mb-8">
          <h1 className="font-heading text-[24px] text-ink font-normal leading-tight">
            I am...
          </h1>
        </div>

        {/* Selectable Cards: Lady and Guy */}
        <div className="flex flex-col space-y-4">
          <button
            type="button"
            onClick={() => handleSelect("lady")}
            className={cn(
              "relative flex flex-col items-center justify-center h-[140px] w-full rounded-[24px] transition-all cursor-pointer select-none",
              selectedRole === "lady"
                ? "border-2 border-[#FF5A7E] bg-[#FFC2CE]/20 shadow-[0_8px_32px_rgba(255,90,126,0.08)]"
                : "border border-[#F5E6E8] bg-white hover:border-[#FFC2CE]"
            )}
          >
            <div className="mb-2">
              <Image
                src="/illustrations/woman-silhouette.svg"
                alt="Lady"
                width={48}
                height={48}
                className="opacity-90"
              />
            </div>
            <span className="font-heading text-[20px] text-ink font-normal">
              Lady
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleSelect("guy")}
            className={cn(
              "relative flex flex-col items-center justify-center h-[140px] w-full rounded-[24px] transition-all cursor-pointer select-none",
              selectedRole === "guy"
                ? "border-2 border-[#FF5A7E] bg-[#FFC2CE]/20 shadow-[0_8px_32px_rgba(255,90,126,0.08)]"
                : "border border-[#F5E6E8] bg-white hover:border-[#FFC2CE]"
            )}
          >
            <div className="mb-2">
              <Image
                src="/illustrations/man-silhouette.svg"
                alt="Guy"
                width={48}
                height={48}
                className="opacity-90"
              />
            </div>
            <span className="font-heading text-[20px] text-ink font-normal">
              Guy
            </span>
          </button>
        </div>
      </main>

      {/* Bottom Sticky Button Container */}
      <footer className="sticky bottom-0 left-0 right-0 z-20 p-6 bg-gradient-to-t from-canvas via-canvas/90 to-transparent">
        <div className="mx-auto w-full max-w-[480px]">
          <Button
            type="button"
            variant="primary"
            disabled={!selectedRole}
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
