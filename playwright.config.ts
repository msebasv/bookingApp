import { defineConfig, devices } from "@playwright/test";

const databaseUrl = "file:./e2e.db";
const port = 3100;
const baseURL = `http://127.0.0.1:${port}`;
process.env.DATABASE_URL = databaseUrl;

export default defineConfig({
  testDir: "tests/e2e",
  workers: 1,
  fullyParallel: false,
  globalSetup: "./tests/global-setup.ts",
  timeout: 120_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  webServer: {
    command: `npx next start --port ${port}`,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
    },
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
