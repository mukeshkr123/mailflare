import { defineConfig, devices } from "@playwright/test";

/** Tests own a production Node server and fresh SQLite database per scenario. */
export default defineConfig({
	testDir: "./tests/e2e",
	testMatch: "setup-production.spec.ts",
	workers: 1,
	retries: 0,
	timeout: 60_000,
	use: { ...devices["Desktop Chrome"], trace: "retain-on-failure" },
});
