import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

test.describe.configure({ mode: "serial" });
test.use({ viewport: { width: 1280, height: 900 }, isMobile: false, hasTouch: false });

async function expectNoA11yViolations(page: Page) {
  await expect(page).toHaveTitle(/FairShift/);
  await page.waitForTimeout(600);
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(", ")}`)).toEqual([]);
}

async function loginAs(page: Page, name: RegExp) {
  await page.goto("/login");
  await page.getByRole("button", { name }).click();
  await page.waitForURL(/\/(w|a)$/);
}

test("overview shows KPIs, attention items and charts", async ({ page }) => {
  await loginAs(page, /Priya/);
  await expect(page.getByRole("heading", { name: "Needs attention" })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Workers present per day/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: "AI transparency" })).toBeVisible();
  await expectNoA11yViolations(page);
});

test("a worker's report reaches the admin, and the status change reaches the worker", async ({ browser }) => {
  test.setTimeout(90_000); // drives two browsers end to end
  const worker = await (await browser.newContext()).newPage();
  await loginAs(worker, /Ramesh/);
  await worker.goto("/w/report");
  await worker.getByRole("button", { name: "Heat" }).click();
  await worker.getByRole("checkbox", { name: "Hide my name" }).uncheck();
  await worker.getByRole("button", { name: "Send report" }).click();
  await worker.waitForURL(/\/w\/report\/haz-/);
  const reportUrl = worker.url().split("?")[0];

  const admin = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  await loginAs(admin, /Priya/);
  await admin.goto("/a/hazards");
  await expectNoA11yViolations(admin);
  const card = admin.getByTestId("hazard-card").filter({ hasText: "Heat" }).filter({ hasText: "Ramesh" });
  await expect(card).toBeVisible();
  await card.getByRole("button", { name: "Start work" }).click();
  await expect(admin.getByRole("region", { name: /In progress/ }).getByTestId("hazard-card").filter({ hasText: "Heat" })).toBeVisible();

  await worker.goto(reportUrl);
  await expect(worker.getByText("In progress").first()).toBeVisible();
});

test("people page explains fatigue and risk", async ({ page }) => {
  await loginAs(page, /Priya/);
  await page.goto("/a/people");
  await expect(page.getByRole("table")).toBeVisible();
  await expect(page.getByRole("rowheader", { name: /Ramesh Kumar/ })).toBeVisible();
  await expectNoA11yViolations(page);
});

test("feedback page hides small groups and offers a brief", async ({ page }) => {
  await loginAs(page, /Priya/);
  await page.goto("/a/feedback");
  await expect(page.getByText(/Groups smaller than 5 are hidden/)).toBeVisible();
  await page.getByRole("button", { name: "Generate brief" }).click();
  await expect(page.getByText(/workers are on site now/)).toBeVisible();
  await expectNoA11yViolations(page);
});

test("payroll exports a CSV only for admins", async ({ page, request }) => {
  expect((await request.get("/api/payroll")).status()).toBe(401);
  await loginAs(page, /Priya/);
  await page.goto("/a/payroll");
  await expectNoA11yViolations(page);
  const csv = await page.request.get("/api/payroll");
  expect(csv.headers()["content-type"]).toContain("text/csv");
  const text = await csv.text();
  expect(text.split("\r\n")[0]).toContain("Overtime hours");
  expect(text).toContain("Ramesh Kumar");
});

test("sites page lists sector rules and kiosk links", async ({ page }) => {
  await loginAs(page, /Priya/);
  await page.goto("/a/sites");
  await expect(page.getByText(/8h\/day · 48h\/week · OT 2×/)).toBeVisible();
  await expectNoA11yViolations(page);
});
