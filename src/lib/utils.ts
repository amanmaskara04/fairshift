import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// Our theme colours (globals.css @theme) so `bg-brand` correctly overrides `bg-card`, etc.
const THEME_COLORS = [
  "brand",
  "brand-foreground",
  "brand-soft",
  "brand-soft-foreground",
  "accent",
  "accent-foreground",
  "ink",
  "danger",
  "warning",
  "success",
  "status-foreground",
  "background",
  "foreground",
  "muted",
  "muted-foreground",
  "border",
  "card",
  "card-foreground",
  "slab",
  "slab-foreground",
  "slab-muted",
  "slab-line",
];

const twMerge = extendTailwindMerge({
  extend: {
    theme: { color: THEME_COLORS, radius: ["worker", "admin"] },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
