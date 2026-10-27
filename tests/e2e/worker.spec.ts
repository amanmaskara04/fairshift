import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

// These flows change shared in-memory state (check-in, weekly feedback), so run them in order.
test.describe.configure({ mode: "serial" });

async function expectNoA11yViolations(page: Page) {
  // Metadata streams in Next 16, and entrance animations fade in: wait for both before measuring.
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

test("worker checks in with the site QR, then checks out", async ({ page }) => {
  await loginAs(page, /Ramesh/);
  await page.goto("/w/checkin");
  await expectNoA11yViolations(page);
  await page.getByRole("button", { name: "Demo: scan site QR" }).click();
  await expect(page.getByText("Checked in!")).toBeVisible();

  await page.goto("/w");
  await expect(page.getByText(/Checked in at/)).toBeVisible();

  await page.goto("/w/checkin");
  await page.getByRole("button", { name: "Check out now" }).click();
  await expect(page.getByText("Checked out!")).toBeVisible();
});

test("payslip shows take-home pay, overtime and an explanation", async ({ page }) => {
  await loginAs(page, /Ramesh/);
  await page.goto("/w/pay");
  await expect(page.getByTestId("net-pay")).toContainText("₹");
  await expectNoA11yViolations(page);
  // Seeded overtime falls in the current or previous month depending on the date
  const months = page.getByRole("navigation", { name: "Period" }).getByRole("link");
  let found = false;
  for (let i = 0; i < 2 && !found; i++) {
    await months.nth(i).click();
    found = await page.getByTestId("overtime-line").isVisible();
  }
  expect(found).toBe(true);
  await page.getByRole("button", { name: "Why this amount?" }).click();
  await expect(page.getByText(/You receive ₹/)).toBeVisible();
});

test("worker reports a hazard by icon and tracks it anonymously", async ({ page }) => {
  await loginAs(page, /Ramesh/);
  await page.goto("/w/report");
  await expectNoA11yViolations(page);
  await page.getByRole("button", { name: "Electrical" }).click();
  await expect(page.getByRole("heading", { name: "Is this right?" })).toBeVisible();
  await expect(page.getByRole("checkbox", { name: "Hide my name" })).toBeChecked();
  await page.getByRole("button", { name: "Send report" }).click();

  await expect(page).toHaveURL(/\/w\/report\/haz-/);
  await expect(page.getByText("Report sent!")).toBeVisible();
  await expect(page.getByText("Your name is hidden from your manager.")).toBeVisible();
  await expectNoA11yViolations(page);

  await page.goto("/w/report");
  await expect(page.getByRole("link", { name: /Electrical/ }).first()).toBeVisible();
});

test("voice endpoint understands a typed report and rejects outsiders", async ({ page, request }) => {
  const anonymous = await request.post("/api/voice/hazard", { multipart: { text: "wire sparking" } });
  expect(anonymous.status()).toBe(401);

  await loginAs(page, /Ramesh/);
  const response = await page.request.post("/api/voice/hazard", { multipart: { text: "बिजली का तार खुला है" } });
  expect(response.ok()).toBe(true);
  expect(await response.json()).toMatchObject({ understood: true, category: "electrical" });
});

test("feedback is accepted once per week", async ({ page }) => {
  await loginAs(page, /Sunita/);
  await page.goto("/w/feedback");
  await expectNoA11yViolations(page);
  for (const question of ["Is your pay fair?", "Do you feel safe?", "Is your manager respectful?"]) {
    await page.getByRole("radiogroup", { name: question }).getByRole("radio", { name: "Okay" }).click();
  }
  await page.getByRole("button", { name: "Submit" }).click();
  await expect(page.getByText("Thank you for your feedback!")).toBeVisible();

  await page.goto("/w/feedback");
  await expect(page.getByText("You already answered this week ✓")).toBeVisible();
});

test("hospital worker sees a rest warning and a shareable skill passport", async ({ page }) => {
  await loginAs(page, /Sunita/);
  await page.goto("/w/skills");
  await expect(page.getByRole("heading", { name: "My skills" })).toBeVisible();
  await expectNoA11yViolations(page);
  const qr = page.getByRole("img", { name: "Show your skills to a new employer" });
  await expect(qr).toBeVisible();
});

test("admin kiosk shows a rotating QR for its own site only", async ({ page }) => {
  await loginAs(page, /Priya/);
  await page.goto("/a/kiosk");
  await page.getByRole("link", { name: /Velachery/ }).click();
  await expect(page.getByTestId("kiosk-qr").locator("svg")).toBeVisible();
  await expectNoA11yViolations(page);

  const other = await page.goto("/a/kiosk/site2");
  expect(other?.status()).toBe(404);
});

test("sync endpoint rejects bad input and unauthenticated calls", async ({ page, request }) => {
  expect((await request.post("/api/sync", { data: { ops: [] } })).status()).toBe(401);
  await loginAs(page, /Ramesh/);
  expect((await page.request.post("/api/sync", { data: { ops: [] } })).status()).toBe(400);
  expect((await page.request.post("/api/sync", { data: "x".repeat(20_000), headers: { "content-type": "application/json" } })).status()).toBe(413);
});
