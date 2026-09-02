import { defineConfig, devices } from "@playwright/test";

/**
 * BDD happy-path suite — expand after demo API is live.
 * For now this config is wired; scenarios that need a running API are skipped.
 */
export default defineConfig({
  testDir: "tests/bdd",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
