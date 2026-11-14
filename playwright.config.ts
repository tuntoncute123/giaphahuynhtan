import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 120000,
  use: {
    actionTimeout: 15000,
    navigationTimeout: 20000,
    baseURL: "http://127.0.0.1:3100",
    viewport: { width: 1440, height: 1000 },
    trace: "retain-on-failure",
    launchOptions: {
      args: [
        "--use-fake-device-for-media-stream",
        "--use-fake-ui-for-media-stream",
      ],
    },
  },
  webServer:
    process.env.E2E_USE_RUNNING === "1"
      ? undefined
      : {
          command: "node scripts/serve-e2e.mjs",
          wait: { stdout: /Ready in/ },
          gracefulShutdown: { signal: "SIGTERM", timeout: 5000 },
          timeout: 60000,
        },
});
