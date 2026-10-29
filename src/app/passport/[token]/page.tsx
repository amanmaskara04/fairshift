import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { BadgeCheck } from "lucide-react";
import { getRepos } from "@/server/repos";
import { workerIdFromPassport } from "@/server/passport";
import { Card } from "@/components/ui/card";
import { BrandMark } from "@/components/brand-mark";

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
    <main id="main" className="worker mx-auto flex w-full max-w-md flex-1 flex-col gap-5 px-5 py-8">
      <BrandMark />
      <section className="slab flex flex-col gap-2 rounded-[28px] p-6">
        <BadgeCheck aria-hidden="true" className="size-8 text-accent" />
        <h1 className="font-display text-3xl leading-tight font-extrabold">{t("passportOf", { name: `${first} ${last?.[0] ?? ""}.` })}</h1>
        <p className="text-slab-muted">{t("passportIssuer", { org: org?.name ?? "" })}</p>
      </section>
      <ul className="stagger flex flex-col gap-2.5">
        {verified.map((skill) => (
          <li key={skill.id}>
            <Card className="flex items-center gap-3 rounded-2xl p-4">
              <span aria-hidden="true" className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-success text-status-foreground">
                <BadgeCheck className="size-6" />
              </span>
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
