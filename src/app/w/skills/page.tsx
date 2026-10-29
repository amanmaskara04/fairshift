import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";
import { QRCodeSVG } from "qrcode.react";
import { BadgeCheck, Clock, LogOut } from "lucide-react";
import { requireRole } from "@/server/dal";
import { getRepos } from "@/server/repos";
import { passportToken } from "@/server/passport";
import { logout } from "@/server/actions/auth";
import { Badge } from "@/components/ui/badge";
import { SubmitButton } from "@/components/ui/submit-button";
import { Card } from "@/components/ui/card";
import { SpeakButton } from "@/components/speak-button";
import { PageHeader } from "@/components/page-header";

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
    <div className="flex flex-col gap-4 md:mx-auto md:w-full md:max-w-3xl">
      <PageHeader title={t("title")} action={<SpeakButton text={`${t("title")}. ${t("summary", { count: skills.length, verified })}`} />} />
      <p className="text-muted-foreground">{t("summary", { count: skills.length, verified })}</p>

      <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-start">
      <ul className="stagger flex flex-col gap-2.5">
        {skills.map((skill) => (
          <li key={skill.id}>
            <Card className="flex items-center justify-between gap-3 rounded-2xl p-4">
              <div className="flex items-center gap-3">
                <span aria-hidden="true" className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-soft-foreground">
                  <BadgeCheck className="size-6" />
                </span>
                <div>
                  <p className="font-bold">{skill.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {skill.issuer} · {formatDate(skill.date)}
                  </p>
                </div>
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

      <section className="slab flex flex-col items-center gap-3 rounded-[28px] p-6 text-center md:w-80">
        <h2 className="font-display text-2xl font-extrabold">{t("shareTitle")}</h2>
        <p className="text-slab-muted">{t("shareHint")}</p>
        <div className="mt-1 rounded-3xl bg-white p-4 ring-8 ring-accent/25">
          <QRCodeSVG value={shareUrl} size={180} title={t("shareTitle")} />
        </div>
      </section>
      </div>

      <form action={logout}>
        <SubmitButton variant="outline" size="lg" className="w-full">
          <LogOut aria-hidden="true" className="size-5" />
          {tc("logout")}
        </SubmitButton>
      </form>
    </div>
  );
}
