import assert from "node:assert/strict";
import test, { after } from "node:test";
import { loadFixture } from "./helpers/fixtures.mjs";

const fixtures = [];
after(() => { fixtures.forEach((fixture) => fixture.dispose()); delete globalThis.updateTestUser; });
const mocks = {
	"next/server": 'export class NextResponse extends Response { static json(data, init) { return Response.json(data, init); } }',
	"@/lib/cloudflare": "export function getEnv(){return {}}",
	"@/lib/auth/cookies": "export async function requireUser(){if(!globalThis.updateTestUser)throw new Error('Unauthorized');return globalThis.updateTestUser}",
};
for (const method of ["GET", "POST"]) {
	const fixture = await loadFixture({ name: "manual-updates", entryPoint: `src/app/api/admin/update/${method}.ts`, mocks });
	fixtures.push(fixture);
	const handler = (await fixture.import())[method];
	test(`update ${method} enforces authorization and performs no network requests`, async () => {
		const originalFetch = globalThis.fetch;
		globalThis.fetch = () => { throw new Error("Updater attempted network access"); };
		try {
			const request = new Request("https://mail.example.com/api/admin/update", { method });
			globalThis.updateTestUser = null;
			assert.equal((await handler(request)).status, 401);
			globalThis.updateTestUser = { role: "user", isPrimaryAdmin: false };
			assert.equal((await handler(request)).status, 403);
			globalThis.updateTestUser = { role: "admin", isPrimaryAdmin: true };
			const response = await handler(request);
			assert.equal(response.status, method === "POST" ? 410 : 200);
			assert.equal(response.headers.get("Cache-Control"), "no-store");
			if (method === "GET") {
				const body = await response.json();
				assert.equal(body.mode, "manual");
				assert.equal(typeof body.currentVersion, "string");
			}
		} finally { globalThis.fetch = originalFetch; }
	});
}
