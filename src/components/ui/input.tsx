import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return (
    <input
      className={cn(
        "min-h-12 w-full rounded-2xl border border-border bg-card px-4 text-base text-card-foreground transition-[border-color,box-shadow] placeholder:text-muted-foreground hover:border-ink/40 focus:border-ink",
        className,
      )}
      {...props}
    />
  );
}

export function Label({ className, ...props }: ComponentProps<"label">) {
  return <label className={cn("block text-sm font-bold", className)} {...props} />;
}
