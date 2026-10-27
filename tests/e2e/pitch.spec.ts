import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.use({ viewport: { width: 1366, height: 860 }, isMobile: false, hasTouch: false });

test("pitch deck navigates with the keyboard and keeps the slide in the URL", async ({ page }) => {
  await page.goto("/pitch");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Fair work. Fair pay. Your voice.");
  await expect(page.getByText("01 / 16")).toBeVisible();

  await page.keyboard.press("ArrowRight");
  await expect(page.getByText("02 / 16")).toBeVisible();
  await expect(page).toHaveURL(/#problem$/);

  await page.keyboard.press("End");
  await expect(page.getByText("16 / 16")).toBeVisible();
  await expect(page.getByRole("button", { name: "Next slide" })).toBeDisabled();

  await page.keyboard.press("Home");
  await expect(page.getByText("01 / 16")).toBeVisible();
});

test("pitch deck opens on a linked slide and embeds the live demo", async ({ page }) => {
  await page.goto("/pitch#demo");
  await expect(page.getByRole("heading", { level: 1, name: "Try it right here" })).toBeVisible();
  const demo = page.frameLocator('iframe[title="Worker app demo"]');
  await expect(demo.getByRole("button", { name: /Ramesh/ })).toBeVisible();
});

test("every pitch slide has no accessibility violations", async ({ page }) => {
  test.setTimeout(120_000); // 16 full axe scans
  await page.goto("/pitch");
  for (let i = 0; i < 16; i++) {
    await page.waitForTimeout(450); // let the entrance animation finish before measuring contrast
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).exclude("iframe").analyze();
    expect(results.violations.map((v) => `slide ${i + 1} ${v.id}: ${v.nodes.map((n) => n.target).join(", ")}`)).toEqual([]);
    await page.keyboard.press("ArrowRight");
  }
});
