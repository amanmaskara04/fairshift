import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { MapPin, QrCode } from "lucide-react";
import { requireRole } from "@/server/dal";
import { getRepos } from "@/server/repos";
import { Card } from "@/components/ui/card";

export default async function KioskIndex() {
  const session = await requireRole("admin");
  const t = await getTranslations("kiosk");
  const sites = await getRepos().sites.getByOrg(session.orgId);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-3xl font-extrabold">{t("title")}</h1>
      <p className="text-muted-foreground">{t("intro")}</p>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {sites.map((site) => (
          <li key={site.id}>
            <Link href={`/a/kiosk/${site.id}`} className="block">
              <Card className="flex items-center gap-3 rounded-admin hover:border-brand">
                <QrCode aria-hidden="true" className="size-8 text-brand" />
                <div>
                  <p className="font-bold">{site.name}</p>
                  <p className="flex items-center gap-1 text-sm text-muted-foreground">
                    <MapPin aria-hidden="true" className="size-4" />
                    {t("open")}
                  </p>
                </div>
              </Card>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
