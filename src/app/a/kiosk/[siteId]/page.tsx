import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireRole } from "@/server/dal";
import { getRepos } from "@/server/repos";
import { kioskTokenAction } from "@/server/actions/attendance";
import { RotatingQr } from "@/components/admin/rotating-qr";

export default async function KioskPage({ params }: PageProps<"/a/kiosk/[siteId]">) {
  const session = await requireRole("admin");
  const { siteId } = await params;
  const site = await getRepos().sites.getById(siteId);
  if (!site || site.orgId !== session.orgId) notFound();
  const t = await getTranslations("kiosk");
  const initialToken = await kioskTokenAction(site.id);

  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-4 text-center">
      <h1 className="text-3xl font-bold">{site.name}</h1>
      <p className="text-lg text-muted-foreground">{t("scanHere")}</p>
      <RotatingQr siteId={site.id} initialToken={initialToken ?? ""} />
    </div>
  );
}
