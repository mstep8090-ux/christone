import * as React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  headline: string;
  subtext: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
}

export function EmptyState({
  headline,
  subtext,
  actionLabel,
  onAction,
  icon,
  className,
  ...props
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center py-10 px-6",
        className
      )}
      {...props}
    >
      <div className="w-[120px] h-[120px] rounded-[24px] border border-[#F5E6E8] bg-white shadow-[0_8px_32px_rgba(255,90,126,0.08)] flex items-center justify-center mb-6">
        {icon ? (
          icon
        ) : (
          <div className="w-12 h-12 flex items-center justify-center text-[#1A1A1E]">
            <svg
              width="48"
              height="48"
              viewBox="0 0 48 48"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M24 38.5C24 38.5 8 28.5 8 17.5C8 12.5294 12.0294 8.5 17 8.5C20.084 8.5 22.7828 10.0519 24 12.441C25.2172 10.0519 27.916 8.5 31 8.5C35.9706 8.5 40 12.5294 40 17.5C40 28.5 24 38.5 24 38.5Z"
                stroke="#1A1A1E"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        )}
      </div>
      <h3 className="font-heading text-[20px] font-normal leading-snug text-[#1A1A1E] mb-2">
        {headline}
      </h3>
      <p className="text-[14px] text-[#6B5B5F] max-w-[280px] mb-6 leading-relaxed">
        {subtext}
      </p>
      {actionLabel && (
        <Button variant="primary" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
