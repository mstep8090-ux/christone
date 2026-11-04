"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface SkeletonCardProps extends React.HTMLAttributes<HTMLDivElement> {
  count?: number;
}

export function SkeletonCard({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "w-full h-[80px] bg-[#F5E6E8] animate-pulse rounded-[24px]",
        className
      )}
      {...props}
    />
  );
}

/**
 * Standard 3 skeleton cards stack as specified in UX requirements
 */
export function SkeletonList({
  count = 3,
  className,
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-3.5 w-full", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}
