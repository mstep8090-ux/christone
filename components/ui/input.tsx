import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-[56px] w-full rounded-[16px] border border-[#F5E6E8] bg-white px-5 text-sm text-[#1A1A1E] placeholder:text-[#6B5B5F]/60 transition-all focus:outline-none focus:ring-2 focus:ring-[#FF5A7E] disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
