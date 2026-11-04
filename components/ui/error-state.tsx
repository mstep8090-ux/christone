"use client";

import * as React from "react";
import { RefreshCw, HeartHandshake } from "lucide-react";
import { cn } from "@/lib/utils";

interface ErrorStateProps {
  onRetry?: () => void;
  className?: string;
  message?: string;
}

export function ErrorState({
  onRetry,
  className,
  message = "Something soft broke. Try again.",
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        "rounded-[24px] bg-[#FFF5F7] border border-[#F5E6E8] p-6 text-center space-y-4 shadow-[0_8px_32px_rgba(255,90,126,0.04)]",
        className
      )}
    >
      <div className="w-12 h-12 rounded-full bg-white border border-[#F5E6E8] flex items-center justify-center mx-auto text-[#FF5A7E] shadow-xs">
        <HeartHandshake size={22} strokeWidth={1.5} />
      </div>

      <div className="space-y-1">
        {/* Text EXACT: "Something soft broke. Try again." */}
        <h4 className="font-heading text-lg sm:text-xl text-[#1A1A1E] font-normal">
          {message}
        </h4>
        <p className="text-xs text-[#6B5B5F]">
          Grace for the moment. Let’s refresh and reconnect.
        </p>
      </div>

      {onRetry && (
        <div className="pt-1">
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center space-x-1.5 h-10 px-5 rounded-full bg-[#FF5A7E] hover:bg-[#E84367] text-white text-xs font-medium shadow-xs transition-all active:scale-[0.98]"
          >
            <RefreshCw size={13} strokeWidth={2} />
            <span>Retry</span>
          </button>
        </div>
      )}
    </div>
  );
}
