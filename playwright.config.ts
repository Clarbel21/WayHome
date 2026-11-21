import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e",
  // Worker cap: a few workers keep the cross-tab scenarios (they share
  // localStorage through one dev server) reliable on laptops and CI.
  workers: process.env.PW_WORKERS ? Number(process.env.PW_WORKERS) : 4,
  use: {
    baseURL: "http://127.0.0.1:5173",
    headless: true,
    launchOptions: { executablePath: process.env.CHROMIUM_PATH },
    // Helper stabilization: consistent budgets for auto-waiting actions.
    actionTimeout: 10_000,
    navigationTimeout: 15_000,
  },
  expect: { timeout: 7_000 },
  webServer: {
    command: "npm run dev -- --host 127.0.0.1",
    url: "http://127.0.0.1:5173",
    reuseExistingServer: true,
  },
  reporter: "list",
});
