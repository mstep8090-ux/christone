"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Heart, MessageCircle, Gamepad2 } from "lucide-react";
import { cn } from "@/lib/utils";

function PrayIcon({ className }: { className?: string }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M12 3.5V19.5" />
      <path d="M12 3.5C11.25 4.5 9.75 6.5 9.5 9.25C9.25 12 9.5 16 9.5 19.5" />
      <path d="M12 3.5C12.75 4.5 14.25 6.5 14.5 9.25C14.75 12 14.5 16 14.5 19.5" />
      <path d="M7 11.5C6.75 13.5 7.25 16.5 7.5 19.5" />
      <path d="M17 11.5C17.25 13.5 16.75 16.5 16.5 19.5" />
    </svg>
  );
}

export type TabKey = "space" | "talks" | "games" | "pray";

export interface BottomNavProps {
  activeTab?: TabKey;
  onTabChange?: (tab: TabKey) => void;
}

export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  const pathname = usePathname();

  const tabs = [
    {
      key: "space" as TabKey,
      label: "Space",
      href: "/space",
      icon: Heart,
    },
    {
      key: "talks" as TabKey,
      label: "Talks",
      href: "/talks",
      icon: MessageCircle,
    },
    {
      key: "games" as TabKey,
      label: "Games",
      href: "/games",
      icon: Gamepad2,
    },
    {
      key: "pray" as TabKey,
      label: "Pray",
      href: "/pray",
      icon: PrayIcon,
    },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 pointer-events-none">
      <div className="mx-auto max-w-[480px] w-full px-4 pb-3">
        <nav className="pointer-events-auto h-[72px] w-full rounded-[24px] bg-white/90 backdrop-blur-md border border-[#F5E6E8] shadow-[0_8px_32px_rgba(255,90,126,0.08)] flex items-center justify-around px-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab
              ? activeTab === tab.key
              : pathname
              ? pathname.startsWith(tab.href)
              : false;

            return (
              <Link
                key={tab.key}
                href={tab.href}
                onClick={(e) => {
                  if (onTabChange) {
                    e.preventDefault();
                    onTabChange(tab.key);
                  }
                }}
                className={cn(
                  "flex flex-col items-center justify-center flex-1 h-full min-h-[44px] py-1 transition-all select-none active:scale-95 group",
                  isActive ? "text-[#FF5A7E]" : "text-[#6B5B5F] hover:text-[#1A1A1E]"
                )}
              >
                <Icon
                  {...(tab.key !== "pray" ? { strokeWidth: 1.5, size: 22 } : {})}
                  className={cn("mb-1 transition-transform group-hover:scale-105", isActive && "scale-110")}
                />
                <span
                  className={cn(
                    "text-[11px] font-medium tracking-tight",
                    isActive ? "font-semibold text-[#FF5A7E]" : "text-[#6B5B5F]"
                  )}
                >
                  {tab.label}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
