import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      DASHBOARD_PASSCODE: "test-passcode",
      NOTION_API_KEY: "test-notion-api-key",
      NOTION_DATA_SOURCE_ID:
        '{"Finance 2026":"11111111111111111111111111111111","Side Account":"22222222222222222222222222222222"}',
      TRADING_212_API_KEY: "test-trading-212-key",
      TRADING_212_API_SECRET: "test-trading-212-secret",
    },
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
