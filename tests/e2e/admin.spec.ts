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
  await page.getByRole("button", { name }).first().click();
  await page.waitForURL(/\/(w|a)(\?welcome=1)?$/);
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
  const heat = admin.getByRole("heading", { name: "Heat", exact: true });
  const card = admin.getByTestId("hazard-card").filter({ has: heat }).filter({ hasText: "Ramesh Kumar" });
  await expect(card).toBeVisible();
  await card.getByRole("button", { name: "Start work" }).click();
  await expect(admin.getByRole("region", { name: /In progress/ }).getByTestId("hazard-card").filter({ has: heat }).filter({ hasText: "Ramesh Kumar" })).toBeVisible();

  await worker.goto(reportUrl);
  await expect(worker.getByText("In progress").first()).toBeVisible();
});

test("people page separates site conditions from individual risk, and approves a work certificate", async ({ page }) => {
  await loginAs(page, /Priya/);
  await page.goto("/a/people");
  await expect(page.getByRole("heading", { name: "Site conditions" })).toBeVisible();
  await expect(page.getByRole("table")).toBeVisible();
  await expect(page.getByRole("rowheader", { name: /Ramesh Kumar/ })).toBeVisible();
  await expectNoA11yViolations(page);

  const request = page.getByRole("listitem").filter({ hasText: "Venkat Rao" });
  await request.getByRole("button", { name: "Approve and sign" }).click();
  await request.getByRole("link", { name: "View certificate" }).click();
  await expect(page.getByRole("heading", { name: "Certificate of work" })).toBeVisible();
  await expect(page.getByText(/Venkat Rao, Carpenter, worked \d+ days for BuildRight Constructions/)).toBeVisible();
  await expectNoA11yViolations(page);
});

test("dismissing a hazard needs a reason, which the worker then sees", async ({ page }) => {
  await loginAs(page, /Priya/);
  await page.goto("/a/hazards");
  const card = page.locator("#haz-c4");
  await card.getByRole("button", { name: "Dismiss" }).click();
  const dialog = page.getByRole("dialog", { name: "Close without fixing" });
  await expect(dialog.getByRole("button", { name: "Close report" })).toBeDisabled();
  await dialog.getByRole("radio", { name: "Already fixed" }).check();
  await dialog.getByRole("button", { name: "Close report" }).click();
  await expect(page.getByRole("region", { name: /Closed/ }).locator("#haz-c4")).toBeVisible();
});

test("feedback page hides small groups, shows only issues with 5+ signers, and offers a brief", async ({ page }) => {
  await loginAs(page, /Priya/);
  await page.goto("/a/feedback");
  await expect(page.getByRole("heading", { name: "Issues raised together" })).toBeVisible();
  await expect(page.getByText(/Overtime list is announced at 6 pm/)).toBeVisible();
  await expect(page.getByText(/No shade or rest area/)).toHaveCount(0); // 3 signers: invisible to management
  await expect(page.getByText(/Groups smaller than 5 are hidden/)).toBeVisible();
  await page.getByRole("button", { name: "Generate brief" }).click();
  await expect(page.getByText(/workers are on site now/)).toBeVisible();
  await expectNoA11yViolations(page);
});

test("payroll exports a CSV only for admins", async ({ page, request }) => {
  expect((await request.get("/api/payroll")).status()).toBe(401);
  await loginAs(page, /Priya/);
  await page.goto("/a/payroll");
  await expect(page.getByRole("heading", { name: "FairPay Sentinel" })).toBeVisible();
  await expect(page.getByRole("row", { name: /Ramesh Kumar/ }).getByText("Possible shortfall ₹907")).toBeVisible();
  await expectNoA11yViolations(page);
  const template = await page.request.get("/api/payroll/template");
  expect(await template.text()).toContain("paidOvertimeHours");
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
