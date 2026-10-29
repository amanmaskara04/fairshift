// Visual QA: screenshots of every screen at phone and laptop widths. Not part of CI.
import { chromium, devices } from "@playwright/test";

const BASE = "http://localhost:3100";
const OUT = process.argv[2] ?? "shots";
const pages = {
  worker: ["/w", "/w/checkin", "/w/pay", "/w/report", "/w/feedback", "/w/skills"],
  admin: ["/a", "/a/hazards", "/a/people", "/a/feedback", "/a/payroll", "/a/sites", "/a/kiosk", "/a/kiosk/site1"],
};

const browser = await chromium.launch();
for (const [label, ctxOpts] of [
  ["phone", { ...devices["Pixel 7"] }],
  ["laptop", { viewport: { width: 1366, height: 860 } }],
]) {
  for (const scheme of ["light", "dark"]) {
    if (scheme === "dark" && label === "laptop") continue;
    const ctx = await browser.newContext({ ...ctxOpts, colorScheme: scheme });
    const page = await ctx.newPage();
    const snap = async (name) => {
      await page.waitForTimeout(1400);
      await page.screenshot({ path: `${OUT}/${label}-${scheme}-${name}.png`, fullPage: true });
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      if (overflow > 0) console.log(`OVERFLOW ${label} ${name}: ${overflow}px`);
    };
    await page.goto(BASE + "/");
    await snap("landing");
    await page.goto(BASE + "/login");
    await snap("login");
    for (const [persona, list] of [["Ramesh", pages.worker], ["Priya", pages.admin]]) {
      await page.goto(BASE + "/login");
      await page.getByRole("button", { name: new RegExp(persona) }).click();
      await page.waitForURL(/\/(w|a)$/);
      for (const path of list) {
        await page.goto(BASE + path);
        await snap(path.replaceAll("/", "_"));
      }
      await ctx.clearCookies();
    }
    await ctx.close();
  }
}
await browser.close();
