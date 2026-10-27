import { getTranslations } from "next-intl/server";
import { Hammer } from "lucide-react";

/** Placeholder for screens built in later tasks. `titleKey` is a full message key. */
export async function ComingSoon({ titleKey }: { titleKey: string }) {
  const t = await getTranslations();
  return (
    <div className="flex flex-col items-center gap-4 py-12 text-center">
      <h1 className="text-2xl font-bold">{t(titleKey)}</h1>
      <Hammer aria-hidden="true" className="size-12 text-muted-foreground" />
      <p className="text-muted-foreground">{t("common.comingSoon")}</p>
    </div>
  );
}
