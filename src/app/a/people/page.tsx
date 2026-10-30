import { getLocale, getTranslations } from "next-intl/server";
import { BadgeCheck, Building, FileText } from "lucide-react";
import { requireRole } from "@/server/dal";
import { getRepos } from "@/server/repos";
import { buildOrgSnapshot } from "@/server/services/workforce";
import { certificateCandidates } from "@/server/services/benefits";
import { pendingSkills } from "@/server/services/skills";
import { certificateToken } from "@/server/passport";
import { getScheme } from "@/config/schemes";
import type { Locale } from "@/i18n/locales";
import { formatDay, formatDuration } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { FatigueReasons, RiskReasons, riskTone } from "@/components/admin/reason-chips";
import { CertificateDecision, SkillDecision } from "@/components/admin/decision-buttons";
import { AddSkill } from "@/components/skill-form";
import { PageHeader } from "@/components/page-header";

export default async function PeoplePage() {
  const session = await requireRole("admin");
  const [t, locale] = await Promise.all([getTranslations("admin.peoplePage"), getLocale() as Promise<Locale>]);
  const repos = getRepos();
  const now = new Date();
  const [snapshot, sites, candidates, skillQueue] = await Promise.all([
    buildOrgSnapshot(repos, session.orgId, now),
    repos.sites.getByOrg(session.orgId),
    certificateCandidates(repos, session.orgId, now),
    pendingSkills(repos, session.orgId),
  ]);
  if (!snapshot) return null;
  const siteOf = new Map(sites.map((s) => [s.id, s.name]));

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title={t("title")}>{t("intro")}</PageHeader>

      <section aria-labelledby="site-context" className="flex flex-col gap-3">
        <h2 id="site-context" className="font-display text-xl font-extrabold">
          {t("siteContext")}
        </h2>
        <p className="text-sm text-ink-2">{t("siteContextHint")}</p>
        <ul className="grid gap-3 md:grid-cols-2">
          {snapshot.sites.map(({ siteId, risk }) => (
            <li key={siteId} className="card flex flex-col gap-2 p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="flex items-center gap-2 font-bold">
                  <Building aria-hidden="true" className="size-4 text-primary" />
                  {siteOf.get(siteId)}
                </p>
                <Badge tone={riskTone(risk.score)}>{t("siteScore", { score: risk.score })}</Badge>
              </div>
              <RiskReasons risk={risk} />
            </li>
          ))}
        </ul>
      </section>

      <section id="skills" aria-labelledby="skills-title" className="flex scroll-mt-24 flex-col gap-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="skills-title" className="font-display text-xl font-extrabold">
              {t("skills.title")}
            </h2>
            <p className="text-sm text-ink-2">{t("skills.hint")}</p>
          </div>
          <AddSkill workers={snapshot.workers.map(({ worker }) => ({ id: worker.id, label: `${worker.name} (#${worker.code})` }))} />
        </div>
        {skillQueue.length === 0 ? (
          <p className="text-ink-2">{t("skills.none")}</p>
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {skillQueue.map(({ skill, worker }) => (
              <li key={skill.id} className="card flex flex-col gap-2 p-4">
                <div className="flex items-start gap-3">
                  <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary-strong">
                    <BadgeCheck className="size-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="font-bold">{skill.title}</p>
                    <p className="text-sm text-ink-2">
                      {worker.name} · {skill.issuer} · {formatDay(skill.date.toISOString().slice(0, 10), locale)}
                    </p>
                    {skill.evidence && <p className="mt-1 text-sm">{t("skills.evidence", { evidence: skill.evidence })}</p>}
                  </div>
                </div>
                <SkillDecision id={skill.id} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section id="certificates" aria-labelledby="cert-title" className="flex scroll-mt-24 flex-col gap-3">
        <h2 id="cert-title" className="font-display text-xl font-extrabold">
          {t("certificates.title")}
        </h2>
        <p className="text-sm text-ink-2">{t("certificates.hint")}</p>
        {candidates.length === 0 ? (
          <p className="text-ink-2">{t("certificates.none")}</p>
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {candidates.map(({ worker, schemeId, progress, request }) => (
              <li key={`${worker.id}-${schemeId}`} className="card flex flex-col gap-2 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-bold">{worker.name}</p>
                    <p className="text-sm text-ink-2">{getScheme(schemeId)?.name[locale]}</p>
                  </div>
                  <Badge tone={progress.done >= progress.needed ? "success" : "warning"} className="figure">
                    {t("certificates.progress", { done: progress.done, needed: progress.needed })}
                  </Badge>
                </div>
                {request?.status === "requested" && (
                  <>
                    <p className="text-sm font-semibold">{t("certificates.requested", { days: request.daysWorked })}</p>
                    <CertificateDecision id={request.id} />
                  </>
                )}
                {request?.status === "approved" && (
                  <a href={`/certificate/${certificateToken(request.id, request.decidedAt ?? request.requestedAt)}`} className="flex w-fit items-center gap-2 text-sm font-bold text-primary underline underline-offset-4">
                    <FileText aria-hidden="true" className="size-4" />
                    {t("certificates.view")}
                  </a>
                )}
                {request?.status === "rejected" && <Badge className="w-fit">{t("certificates.rejected")}</Badge>}
                {!request && <p className="text-sm text-ink-2">{progress.done >= progress.needed ? t("certificates.eligibleNoRequest") : t("certificates.close")}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="people-list" className="flex flex-col gap-3">
        <h2 id="people-list" className="font-display text-xl font-extrabold">
          {t("individualTitle")}
        </h2>
        {/* Phones: one card per worker, every column visible without sideways scrolling. */}
        <ul className="flex flex-col gap-3 md:hidden">
          {snapshot.workers.map((w) => (
            <li key={w.worker.id}>
              <Card className="flex flex-col gap-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-bold">{w.worker.name}</p>
                    <p className="truncate text-sm text-ink-2">
                      {w.worker.jobTitle} · {siteOf.get(w.worker.siteId)}
                    </p>
                  </div>
                  <Badge tone={riskTone(w.risk.score)}>
                    {t("risk")} {w.risk.score}
                  </Badge>
                </div>
                <dl className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <dt className="eyebrow">{t("status")}</dt>
                    <dd>
                      <Badge tone={w.onSite ? "success" : "neutral"}>{w.onSite ? t("onSite") : t("offSite")}</Badge>
                    </dd>
                  </div>
                  <div>
                    <dt className="eyebrow">{t("thisWeek")}</dt>
                    <dd className="figure">
                      {formatDuration(w.weekMinutes)}
                      {w.overtimeThisWeek > 0 && <span className="block text-ink-2">{t("overtime", { hours: formatDuration(w.overtimeThisWeek) })}</span>}
                    </dd>
                  </div>
                </dl>
                <div className="flex flex-col gap-1">
                  <p className="eyebrow">{t("fatigue")}</p>
                  <FatigueReasons alerts={w.fatigue} />
                </div>
                <div className="flex flex-col gap-1">
                  <p className="eyebrow">{t("risk")}</p>
                  <RiskReasons risk={w.risk} />
                </div>
              </Card>
            </li>
          ))}
        </ul>

        {/* Laptops: the full comparison table. */}
        <Card className="hidden overflow-x-auto p-0 md:block" tabIndex={0} role="region" aria-label={t("title")}>
          <table className="w-full min-w-[760px] text-left">
            <caption className="sr-only">{t("title")}</caption>
            <thead className="border-b border-line text-xs tracking-wide text-ink-2 uppercase">
              <tr>
                <th scope="col" className="px-4 py-3 font-bold">{t("worker")}</th>
                <th scope="col" className="px-4 py-3 font-bold">{t("status")}</th>
                <th scope="col" className="px-4 py-3 font-bold">{t("thisWeek")}</th>
                <th scope="col" className="px-4 py-3 font-bold">{t("fatigue")}</th>
                <th scope="col" className="px-4 py-3 font-bold">{t("risk")}</th>
              </tr>
            </thead>
            <tbody>
              {snapshot.workers.map((w) => (
                <tr key={w.worker.id} className="border-t border-line align-top transition-colors hover:bg-surface-2/50">
                  <th scope="row" className="px-4 py-3 font-semibold">
                    {w.worker.name}
                    <span className="block text-sm font-normal text-ink-2">
                      {w.worker.jobTitle} · {siteOf.get(w.worker.siteId)}
                    </span>
                  </th>
                  <td className="px-4 py-3">
                    <Badge tone={w.onSite ? "success" : "neutral"}>{w.onSite ? t("onSite") : t("offSite")}</Badge>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {formatDuration(w.weekMinutes)}
                    {w.overtimeThisWeek > 0 && <span className="block text-sm text-ink-2">{t("overtime", { hours: formatDuration(w.overtimeThisWeek) })}</span>}
                  </td>
                  <td className="px-4 py-3">
                    <FatigueReasons alerts={w.fatigue} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      <Badge tone={riskTone(w.risk.score)} className="w-fit">
                        {w.risk.score} / 100
                      </Badge>
                      <RiskReasons risk={w.risk} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </section>
      <p className="text-sm text-ink-2">{t("method")}</p>
    </div>
  );
}
