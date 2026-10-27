import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";
import { QRCodeSVG } from "qrcode.react";
import { BadgeCheck, Clock, LogOut } from "lucide-react";
import { requireRole } from "@/server/dal";
import { getRepos } from "@/server/repos";
import { passportToken } from "@/server/passport";
import { logout } from "@/server/actions/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SpeakButton } from "@/components/speak-button";

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-IN", { month: "short", year: "numeric", timeZone: "Asia/Kolkata" }).format(date);
}

export default async function SkillsPage() {
  const session = await requireRole("worker");
  const t = await getTranslations("skills");
  const tc = await getTranslations("common");
  const repos = getRepos();
  const [worker, skills] = await Promise.all([repos.workers.getById(session.uid), repos.skills.getByWorker(session.uid)]);
  if (!worker) return null;

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const protocol = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const shareUrl = `${protocol}://${host}/passport/${passportToken(worker.id)}`;
  const verified = skills.filter((s) => s.verifiedBy).length;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <SpeakButton text={`${t("title")}. ${t("summary", { count: skills.length, verified })}`} />
      </div>
      <p className="text-muted-foreground">{t("summary", { count: skills.length, verified })}</p>

      <ul className="flex flex-col gap-2">
        {skills.map((skill) => (
          <li key={skill.id}>
            <Card className="flex items-center justify-between gap-3">
              <div>
                <p className="font-bold">{skill.title}</p>
                <p className="text-sm text-muted-foreground">
                  {skill.issuer} · {formatDate(skill.date)}
                </p>
              </div>
              {skill.verifiedBy ? (
                <Badge tone="success">
                  <BadgeCheck aria-hidden="true" className="size-4" />
                  {t("verified")}
                </Badge>
              ) : (
                <Badge>
                  <Clock aria-hidden="true" className="size-4" />
                  {t("pending")}
                </Badge>
              )}
            </Card>
          </li>
        ))}
      </ul>

      <Card className="flex flex-col items-center gap-3 text-center">
        <h2 className="text-lg font-bold">{t("shareTitle")}</h2>
        <p>{t("shareHint")}</p>
        <div className="rounded-admin bg-white p-3">
          <QRCodeSVG value={shareUrl} size={180} title={t("shareTitle")} />
        </div>
      </Card>

      <form action={logout}>
        <Button type="submit" variant="outline" size="lg" className="w-full">
          <LogOut aria-hidden="true" className="size-5" />
          {tc("logout")}
        </Button>
      </form>
    </div>
  );
}
