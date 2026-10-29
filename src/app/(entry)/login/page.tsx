import { ViewTransition } from "react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { redirect, RedirectType } from "next/navigation";
import { getSession, HOME_FOR_ROLE } from "@/server/dal";
import { RevealText } from "@/components/reveal-text";
import { EntryBar } from "@/components/entry/entry-bar";
import { DemoLogins } from "@/components/entry/demo-logins";
import { LoginForms } from "./login-forms";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("login"))("loginButton") };
}

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const session = await getSession();
  if (session) redirect(HOME_FOR_ROLE[session.role], RedirectType.replace);
  const [t, params] = await Promise.all([getTranslations("login"), searchParams]);

  return (
    <>
      <EntryBar />
      <main id="main" className="mx-auto grid w-full max-w-6xl flex-1 gap-8 px-4 pt-8 pb-[28vh] md:grid-cols-[1fr_1.05fr] md:items-start md:gap-14 md:px-8 md:pt-14">
        <section className="flex flex-col gap-6">
          <h1 className="font-display text-4xl leading-[1.02] font-extrabold md:text-6xl">
            <RevealText text={t("title")} />
          </h1>
          <div className="hidden md:block">
            <DemoLogins compact />
          </div>
        </section>

        {/* The chosen language card morphs into this one. */}
        <ViewTransition name="entry-card" share="card-morph" default="none">
          <div className="card w-full max-w-md justify-self-center p-5 md:p-7">
            <LoginForms initialTab={params.role === "admin" ? "admin" : "worker"} />
          </div>
        </ViewTransition>

        <div className="md:hidden">
          <DemoLogins compact />
        </div>
      </main>
    </>
  );
}
