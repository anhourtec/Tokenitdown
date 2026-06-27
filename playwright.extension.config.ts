import { defineConfig } from "@playwright/test"

export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/extension.spec.ts",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: "list",
  // Extension tests need extra time: Chrome launch + extension load + assertions.
  timeout: 90000,
  use: {
    trace: "on-first-retry",
    actionTimeout: 15000,
  },
})
