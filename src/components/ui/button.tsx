import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50 cursor-pointer",
  {
    variants: {
      variant: {
        primary: "bg-brand text-brand-foreground hover:opacity-90",
        secondary: "bg-brand-soft text-brand-soft-foreground hover:opacity-90",
        outline: "border-2 border-border bg-card text-card-foreground hover:bg-muted",
        ghost: "text-foreground hover:bg-muted",
        danger: "bg-danger text-status-foreground hover:opacity-90",
      },
      size: {
        sm: "min-h-10 px-3 text-sm rounded-admin",
        md: "min-h-12 px-4 text-base rounded-admin",
        lg: "min-h-16 px-6 text-lg rounded-worker",
        icon: "size-12 rounded-full",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export type ButtonProps = ComponentProps<"button"> & VariantProps<typeof buttonVariants>;

export function Button({ className, variant, size, type = "button", ...props }: ButtonProps) {
  return <button type={type} className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
