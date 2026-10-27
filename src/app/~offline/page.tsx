import { getTranslations } from "next-intl/server";
import { WifiOff } from "lucide-react";

export default async function OfflinePage() {
  const t = await getTranslations("offline");
  return (
    <main id="main" className="worker mx-auto flex max-w-md flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
      <WifiOff aria-hidden="true" className="size-16 text-muted-foreground" />
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <p>{t("message")}</p>
    </main>
  );
}
