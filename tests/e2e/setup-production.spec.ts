import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { test as base, expect } from "@playwright/test";

const test = base.extend<{ installation: { url: string; secret: string } }>({
	installation: async ({}, use) => {
		const socket = createServer();
		await new Promise<void>((resolve) => socket.listen(0, "127.0.0.1", resolve));
		const address = socket.address();
		if (!address || typeof address === "string") throw new Error("No test port available");
		const port = address.port;
		await new Promise<void>((resolve) => socket.close(() => resolve()));
		const directory = mkdtempSync(join(tmpdir(), "mailflare-setup-browser-"));
		const secret = Array.from(randomBytes(32), (byte) => byte.toString(16).padStart(2, "0")).join("");
		const url = `http://localhost:${port}`;
		const server = spawn(process.execPath, ["dist/server.mjs"], {
			env: {
				PATH: process.env.PATH, HOME: directory, TMPDIR: directory,
				NODE_ENV: "production", MAILFLARE_RUNTIME: "node", DATA_DIR: directory,
				PORT: String(port), HOST: "127.0.0.1", SMTP_INBOUND_PORT: "0",
				SMTP_URL: "smtp://127.0.0.1:1", APP_URL: url, SETUP_SECRET: secret,
				NEXT_TELEMETRY_DISABLED: "1",
			},
			stdio: ["ignore", "pipe", "pipe"],
		});
		let log = "";
		server.stdout.on("data", (data) => { log = (log + String(data)).slice(-16_384); });
		server.stderr.on("data", (data) => { log = (log + String(data)).slice(-16_384); });
		try {
			const deadline = Date.now() + 30_000;
			while (true) {
				if (server.exitCode !== null) throw new Error(`Local server exited: ${log}`);
				try { if ((await fetch(`${url}/api/setup/status`)).ok) break; } catch { /* wait for listener */ }
				if (Date.now() > deadline) throw new Error(`Local server did not start: ${log}`);
				await delay(100);
			}
			await use({ url, secret });
		} finally {
			server.kill("SIGTERM");
			await Promise.race([new Promise((resolve) => server.once("exit", resolve)), delay(3000)]);
			if (server.exitCode === null) server.kill("SIGKILL");
			rmSync(directory, { recursive: true, force: true });
		}
	},
});

for (const usePasskey of [false, true]) test(`private setup with ${usePasskey ? "a passkey" : "a password"}`, async ({ page, installation }, testInfo) => {
	const { url, secret } = installation;
	if (usePasskey) {
		const cdp = await page.context().newCDPSession(page);
		await cdp.send("WebAuthn.enable");
		await cdp.send("WebAuthn.addVirtualAuthenticator", { options: {
			protocol: "ctap2", transport: "internal", hasResidentKey: true,
			hasUserVerification: true, isUserVerified: true, automaticPresenceSimulation: true,
		} });
		await page.setViewportSize({ width: 390, height: 844 });
	}
	// Merely visiting setup must not start database preparation.
	let preparations = 0;
	page.on("request", (request) => { if (request.url().endsWith("/api/setup/prepare")) preparations++; });
	await page.goto(`${url}/setup`);
	await expect(page.getByLabel("Setup secret", { exact: true })).toBeVisible();
	await page.screenshot({ path: testInfo.outputPath("setup.png"), fullPage: true });
	await expect(page.getByRole("button", { name: "Unlock setup" })).toBeDisabled();
	expect(preparations).toBe(0);
	await page.getByLabel("Setup secret", { exact: true }).fill("incorrect");
	await page.getByRole("button", { name: "Unlock setup" }).click();
	await expect(page.getByRole("alert")).toHaveText("Invalid setup secret");
	await page.getByLabel("Setup secret", { exact: true }).fill(secret);
	await page.getByRole("button", { name: "Unlock setup" }).click();
	await page.getByRole("button", { name: "Continue", exact: true }).click();
	await page.getByRole("switch", { name: "Skip DNS setup" }).check();
	await page.getByLabel("Primary domain").fill("example.test");
	await page.getByRole("button", { name: "Continue", exact: true }).click();
	await page.getByLabel("Username", { exact: true }).fill("owner");
	await page.getByLabel("Recovery email").fill("recovery@example.test");
	if (usePasskey) await page.getByRole("checkbox", { name: "Use a passkey instead" }).check();
	else await page.getByLabel("Password", { exact: true }).fill("dummy-setup-password");
	await page.getByRole("button", { name: "Create account", exact: true }).click();
	if (usePasskey) {
		await page.waitForURL("**/setup/passkey");
		await page.getByRole("button", { name: "Create passkey", exact: true }).click();
		await page.waitForURL("**/inbox");
	} else {
		await page.waitForURL("**/login");
		await page.getByLabel("Email", { exact: true }).fill("owner@example.test");
		await page.getByLabel("Password", { exact: true }).fill("dummy-setup-password");
		await page.getByRole("button", { name: "Sign in", exact: true }).click();
		await page.waitForURL("**/inbox");
	}
	const closed = await page.request.post(`${url}/api/setup/prepare`);
	expect(closed.status()).toBe(403);
	const retired = await page.request.post(`${url}/api/admin/update`);
	expect(retired.status()).toBe(410);
	const status = await page.request.get(`${url}/api/admin/update`);
	expect((await status.json()).mode).toBe("manual");
});
