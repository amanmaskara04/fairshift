import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { BadgeCheck } from "lucide-react";
import { getRepos } from "@/server/repos";
import { workerIdFromPassport } from "@/server/passport";
import { Card } from "@/components/ui/card";

/** Public, read-only skill passport for a future employer. Shows only verified skills and first name + initial. */
export default async function PassportPage({ params }: PageProps<"/passport/[token]">) {
  const { token } = await params;
  const workerId = workerIdFromPassport(token);
  const repos = getRepos();
  const worker = workerId ? await repos.workers.getById(workerId) : undefined;
  if (!worker) notFound();
  const [skills, org, t] = await Promise.all([
    repos.skills.getByWorker(worker.id),
    repos.orgs.getById(worker.orgId),
    getTranslations("skills"),
  ]);
  const [first, last] = worker.name.split(" ");
  const verified = skills.filter((s) => s.verifiedBy);

  return (
    <main id="main" className="worker mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 py-8">
      <p className="font-bold text-brand">FairShift</p>
      <h1 className="text-3xl font-bold">{t("passportOf", { name: `${first} ${last?.[0] ?? ""}.` })}</h1>
      <p className="text-muted-foreground">{t("passportIssuer", { org: org?.name ?? "" })}</p>
      <ul className="flex flex-col gap-2">
        {verified.map((skill) => (
          <li key={skill.id}>
            <Card className="flex items-center gap-3">
              <BadgeCheck aria-hidden="true" className="size-8 shrink-0 text-success" />
              <div>
                <p className="font-bold">{skill.title}</p>
                <p className="text-sm text-muted-foreground">{skill.issuer}</p>
              </div>
            </Card>
          </li>
        ))}
      </ul>
    </main>
  );
}
