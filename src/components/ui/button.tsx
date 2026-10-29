import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 font-bold cursor-pointer select-none transition-[transform,background-color,box-shadow,color,border-color] duration-200 ease-[cubic-bezier(0.2,0.8,0.2,1)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] active:duration-75 disabled:pointer-events-none disabled:opacity-55",
  {
    variants: {
      variant: {
        primary: "bg-brand text-brand-foreground hover:shadow-[0_10px_22px_-12px_var(--brand)]",
        accent: "bg-accent text-accent-foreground hover:shadow-[0_10px_22px_-10px_rgb(12_26_22/0.45)]",
        secondary: "bg-brand-soft text-brand-soft-foreground hover:bg-brand-soft/70",
        outline: "border border-ink/25 bg-card text-card-foreground hover:border-ink",
        ghost: "text-foreground hover:bg-muted hover:translate-y-0",
        danger: "bg-danger text-status-foreground hover:shadow-[0_10px_22px_-12px_var(--danger)]",
      },
      size: {
        sm: "min-h-10 px-4 text-sm rounded-full",
        md: "min-h-12 px-5 text-base rounded-full",
        lg: "min-h-16 px-6 text-lg rounded-[18px]",
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
