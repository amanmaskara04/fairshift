import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

// Status is never conveyed by colour alone: callers always pass an icon and a word.
const badgeVariants = cva("inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-sm font-bold", {
  variants: {
    tone: {
      neutral: "bg-muted text-foreground",
      brand: "bg-brand-soft text-brand-soft-foreground",
      signal: "bg-accent text-accent-foreground",
      danger: "bg-danger text-status-foreground",
      warning: "bg-warning text-status-foreground",
      success: "bg-success text-status-foreground",
    },
  },
  defaultVariants: { tone: "neutral" },
});

export type BadgeProps = ComponentProps<"span"> & VariantProps<typeof badgeVariants>;

export function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}
