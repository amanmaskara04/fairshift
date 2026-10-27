import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

async function expectNoA11yViolations(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(", ")}`)).toEqual([]);
}

async function demoLogin(page: Page, name: RegExp) {
  await page.goto("/login");
  await page.getByRole("button", { name }).click();
}

test("landing sends security headers and has no a11y violations", async ({ page }) => {
  const response = await page.goto("/");
  const headers = response!.headers();
  expect(headers["content-security-policy"]).toContain("nonce-");
  expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["x-powered-by"]).toBeUndefined();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expectNoA11yViolations(page);
});

test("choosing Tamil switches the page language", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "தமிழ்" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "ta");
  await expectNoA11yViolations(page);
});

test("protected pages redirect to login without a session", async ({ page }) => {
  await page.goto("/w");
  await expect(page).toHaveURL(/\/login$/);
  await page.goto("/a/hazards");
  await expect(page).toHaveURL(/\/login$/);
});

test("demo worker reaches the worker home", async ({ page }) => {
  await demoLogin(page, /Ramesh/);
  await expect(page).toHaveURL(/\/w$/);
  await expect(page.getByRole("heading", { name: /Ramesh/ })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Main menu" })).toBeVisible();
  await expectNoA11yViolations(page);
});

test("a worker cannot open admin pages", async ({ page }) => {
  await demoLogin(page, /Sunita/);
  await expect(page).toHaveURL(/\/w$/);
  await page.goto("/a");
  await expect(page).toHaveURL(/\/w$/);
});

test("demo admin sees live KPIs", async ({ page }) => {
  await demoLogin(page, /Priya/);
  await expect(page).toHaveURL(/\/a$/);
  await expect(page.getByText("BuildRight Constructions")).toBeVisible();
  await expect(page.getByText("Open hazards")).toBeVisible();
  await expectNoA11yViolations(page);
});

test("wrong PIN shows a friendly error", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Enter your code").fill("1001");
  await page.getByLabel("Enter PIN").fill("9999");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Wrong code or PIN" })).toBeVisible();
});
