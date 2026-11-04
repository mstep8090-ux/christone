import * as React from "react";
import { cn } from "@/lib/utils";

export interface PillProps extends React.HTMLAttributes<HTMLDivElement> {
  active?: boolean;
}

const Pill = React.forwardRef<HTMLDivElement, PillProps>(
  ({ className, active, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-full bg-[#FFC2CE]/50 text-[#1A1A1E] px-4 py-2 text-sm font-medium transition-colors",
          active && "bg-[#FF5A7E] text-white",
          className
        )}
        {...props}
      />
    );
  }
);
Pill.displayName = "Pill";

export { Pill };
