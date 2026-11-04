import * as React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface AvatarProps {
  src?: string | null;
  fallback?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function Avatar({
  src,
  fallback = "U",
  size = "md",
  className,
}: AvatarProps) {
  const sizeClasses = {
    sm: "w-8 h-8 text-xs",
    md: "w-10 h-10 text-sm",
    lg: "w-12 h-12 text-base",
  };

  return (
    <div
      className={cn(
        "rounded-full overflow-hidden flex items-center justify-center font-medium bg-[#FFC2CE]/40 text-[#1A1A1E] border border-border select-none shrink-0 relative",
        sizeClasses[size],
        className
      )}
    >
      {src ? (
        <Image
          src={src}
          alt={fallback}
          fill
          className="object-cover"
        />
      ) : (
        <span>{fallback.slice(0, 1).toUpperCase()}</span>
      )}
    </div>
  );
}
