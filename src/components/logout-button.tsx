"use client";

import { useTranslations } from "next-intl";
import { LogOut } from "lucide-react";
import { logout } from "@/server/actions/auth";
import { resetWelcome } from "@/components/welcome/welcome";
import { SubmitButton } from "@/components/ui/submit-button";
import type { ButtonProps } from "@/components/ui/button";

/** Logs out (the server replaces history with /login) and lets the next login play its welcome again. */
export function LogoutButton({ className, variant = "outline", size = "lg", iconOnly = false }: Pick<ButtonProps, "className" | "variant" | "size"> & { iconOnly?: boolean }) {
  const t = useTranslations("common");
  return (
    <form action={logout} onSubmit={resetWelcome}>
      <SubmitButton variant={variant} size={size} className={className} aria-label={iconOnly ? t("logout") : undefined}>
        <LogOut aria-hidden="true" className="size-5" />
        {!iconOnly && t("logout")}
      </SubmitButton>
    </form>
  );
}
