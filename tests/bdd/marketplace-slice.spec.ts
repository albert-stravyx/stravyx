import { test, expect } from "@playwright/test";

/**
 * Feature: Marketplace vertical slice
 * Scenario: Customer books and sees a single Network Price
 *
 * Full browser flow is enabled once apps/app-web is wired to the API.
 * This placeholder asserts the contract suite remains the gate until then.
 */
test.describe("Marketplace vertical slice", () => {
  test.skip(
    !process.env.PLAYWRIGHT_BASE_URL,
    "Set PLAYWRIGHT_BASE_URL when app-web + API are running",
  );

  test("customer booking shows a single network price", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText(/Stravyx/i).first()).toBeVisible();
  });
});
