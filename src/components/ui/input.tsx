import * as React from "react";
import { cn } from "@/lib/utils/cn";

/**
 * Text input primitive (shadcn/ui style, doc 11 — Inputs).
 * Supports label, placeholder, helper text, error message via parent
 * composition (e.g. react-hook-form `<Controller>`).
 */
const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "border-input bg-surface text-foreground flex h-10 w-full rounded-md border px-3 py-2 text-sm shadow-sm transition-colors",
          "placeholder:text-faint-foreground",
          "focus-visible:ring-ring focus-visible:ring-offset-background focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "file:border-0 file:bg-transparent file:text-sm file:font-medium",
          "aria-[invalid=true]:border-destructive aria-[invalid=true]:focus-visible:ring-destructive",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
