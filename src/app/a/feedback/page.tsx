import { getTranslations } from "next-intl/server";
import { Lock } from "lucide-react";
import { requireRole } from "@/server/dal";
import { getRepos } from "@/server/repos";
import { gateByCohort, K_ANONYMITY } from "@/core/anonymity";
import { countThemes, THEMES } from "@/core/themes";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { WeeklyBrief } from "@/components/admin/weekly-brief";

const QUESTIONS = ["pay", "safety", "respect"] as const;

function avg(values: number[]): number {
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export default async function FeedbackAdminPage() {
  const session = await requireRole("admin");
  const t = await getTranslations("admin.feedbackPage");
  const repos = getRepos();
  const [feedback, sites] = await Promise.all([repos.feedback.getByOrg(session.orgId), repos.sites.getByOrg(session.orgId)]);
  const siteOf = new Map(sites.map((s) => [s.id, s.name]));

  // One group per site and week; groups below k are summarised as a count only.
  const groups = [...gateByCohort(feedback, (f) => `${f.siteId}|${f.weekBucket}`).entries()].sort(([a], [b]) => b.localeCompare(a));

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-3xl font-extrabold">{t("title")}</h1>
      <p className="flex items-center gap-2 text-muted-foreground">
        <Lock aria-hidden="true" className="size-4" />
        {t("privacy", { k: K_ANONYMITY })}
      </p>

      <WeeklyBrief />

      <ul className="grid gap-4 lg:grid-cols-2">
        {groups.map(([key, gate]) => {
          const [siteId, week] = key.split("|");
          return (
            <li key={key}>
              <Card className="flex h-full flex-col gap-3 rounded-admin">
                <h2 className="flex items-center justify-between font-bold">
                  {siteOf.get(siteId)}
                  <Badge>{week}</Badge>
                </h2>
                {!gate.visible ? (
                  <p className="text-muted-foreground">{t("hidden", { count: gate.count, k: gate.needed })}</p>
                ) : (
                  <>
                    <dl className="grid grid-cols-3 gap-2 text-center">
                      {QUESTIONS.map((q) => {
                        const score = avg(gate.items.map((f) => f.scores[q]));
                        return (
                          <div key={q} className="rounded-admin bg-muted p-2">
                            <dt className="text-sm text-muted-foreground">{t(`q.${q}`)}</dt>
                            <dd className="text-xl font-bold">
                              {score.toFixed(1)}
                              <span className="text-sm font-normal text-muted-foreground"> / 3</span>
                            </dd>
                          </div>
                        );
                      })}
                    </dl>
                    <p className="text-sm text-muted-foreground">{t("responses", { count: gate.count })}</p>
                    <Themes comments={gate.items.flatMap((f) => (f.comment ? [f.comment] : []))} label={t("themes")} themeLabel={(theme) => t(`theme.${theme}`)} />
                    <ul className="flex flex-col gap-1 text-sm">
                      {gate.items
                        .filter((f) => f.comment)
                        .map((f) => (
                          <li key={f.id} className="rounded-admin border border-border p-2">
                            “{f.comment}”
                          </li>
                        ))}
                    </ul>
                  </>
                )}
              </Card>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Themes({ comments, label, themeLabel }: { comments: string[]; label: string; themeLabel: (theme: string) => string }) {
  const counts = countThemes(comments);
  const present = THEMES.filter((theme) => counts[theme] > 0);
  if (present.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-1 text-sm">
      <span className="font-semibold">{label}:</span>
      {present.map((theme) => (
        <Badge key={theme} tone="brand">
          {themeLabel(theme)} · {counts[theme]}
        </Badge>
      ))}
    </div>
  );
}
