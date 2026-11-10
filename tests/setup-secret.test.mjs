import assert from "node:assert/strict";
import test, { after } from "node:test";
import { loadFixture } from "./helpers/fixtures.mjs";

const secret = "a1".repeat(32);
const request = (value, body = {}) => new Request("https://mail.example.com/api/setup", {
	method: "POST",
	headers: { "Content-Type": "application/json", ...(value === undefined ? {} : { "X-Mailflare-Setup-Secret": value }) },
	body: JSON.stringify(body),
});
const fixtures = [];
after(() => { fixtures.forEach((fixture) => fixture.dispose()); delete globalThis.setupTest; });
const fixture = await loadFixture({ name: "setup-secret", entryPoint: "src/lib/auth/setup-secret.ts", mocks: {} });
fixtures.push(fixture);
const { requireSetupSecret } = await fixture.import();

test("setup fails closed when the server secret is missing or malformed", async () => {
	for (const value of [undefined, "", "change-me", "a".repeat(63), " "+secret, "a".repeat(258)]) {
		const response = await requireSetupSecret({ SETUP_SECRET: value }, request(secret));
		assert.equal(response.status, 503);
		assert.equal(response.headers.get("Cache-Control"), "no-store");
	}
});
test("setup requires the exact secret in a header", async () => {
	for (const value of [undefined, "", "b2".repeat(32), "a".repeat(257)]) {
		const response = await requireSetupSecret({ SETUP_SECRET: secret }, request(value, { setupSecret: secret }));
		assert.equal(response.status, 403);
		assert.ok(!(await response.text()).includes(secret));
	}
	assert.equal(await requireSetupSecret({ SETUP_SECRET: secret }, request(secret)), null);
});

// Exercise each real handler. Any DB mutation or external call on a denied
// request fails the test instead of contacting a live service.
const boundaryMocks = {
	"next/server": 'export class NextResponse extends Response { static json(data, init) { return Response.json(data, init); } }',
	"@/lib/cloudflare": "export function getEnv(){return globalThis.setupTest.env}",
	"@/lib/auth/setup": "export async function hasAdminAccount(){return globalThis.setupTest.hasAdmin}",
	"@/db": "export function getDb(){throw new Error('Unexpected database access')}",
	"@/lib/setup/configuration": "export function getSetupRequirementChecks(){globalThis.setupTest.checks++;return []}",
	"@/lib/setup/migration": "export async function migrateCleanDatabase(){globalThis.setupTest.migrations++;return true}",
};
const entries = [
	"src/app/api/setup/prepare/route.ts",
	"src/app/api/setup/domain/route.ts",
	"src/app/api/setup/domain/mx/route.ts",
	"src/app/api/auth/register/route.ts",
];
for (const entryPoint of entries) {
	const routeFixture = await loadFixture({ name: "setup-boundary", entryPoint, mocks: boundaryMocks });
	fixtures.push(routeFixture);
	const { POST } = await routeFixture.import();
	test(`${entryPoint}: rejected setup performs no work and existing admins close setup`, async () => {
		globalThis.setupTest = { env: {}, hasAdmin: false, checks: 0, migrations: 0 };
		assert.equal((await POST(request(secret))).status, 503);
		globalThis.setupTest.env.SETUP_SECRET = secret;
		assert.equal((await POST(request())).status, 403);
		assert.equal((await POST(request("b".repeat(64)))).status, 403);
		globalThis.setupTest.hasAdmin = true;
		assert.equal((await POST(request(secret))).status, 403);
		delete globalThis.setupTest.env.SETUP_SECRET;
		assert.equal((await POST(request())).status, 403);
		assert.equal(globalThis.setupTest.checks, 0);
		assert.equal(globalThis.setupTest.migrations, 0);
	});
	if (entryPoint.includes("prepare")) test("a valid setup secret permits database preparation", async () => {
		globalThis.setupTest = { env: { SETUP_SECRET: secret }, hasAdmin: false, checks: 0, migrations: 0 };
		const response = await POST(request(secret));
		assert.equal(response.status, 200, await response.clone().text());
		assert.equal((await response.json()).migrated, true);
		assert.equal(globalThis.setupTest.migrations, 1);
	});
}

const registrationFixture = await loadFixture({
	name: "setup-registration",
	entryPoint: "src/app/api/auth/register/route.ts",
	mocks: {
		...boundaryMocks,
		"next/server": `export class NextResponse extends Response {
			cookies = { set() {} };
			static json(data, init) { return new NextResponse(JSON.stringify(data), init); }
		}`,
		"@/db": `export function getDb(){
			const query={from(){return query},where(){return query},async limit(){return []}};
			return {select(){return query},insert(){return {async values(row){globalThis.setupTest.rows.push(row)}}}};
		}`,
		"@/lib/auth/webauthn/grants": 'export const SETUP_COOKIE="ep_setup"; export async function createEnrollmentGrant(){return "dummy-enrollment-grant"}',
		"@/lib/domains/service": 'export async function addDomainForUser(){return {domain:{id:"dummy-domain",zoneId:"manual"},changes:{createdAddressRules:[]}}}',
		"@/lib/domains/rollback": 'export async function rollbackDomainProvisioning(){}',
		"@/lib/domains/errors": 'export function getDomainProvisioningError(error){return {message:error.message,status:502}}',
		"@/lib/cloudflare-api": 'export async function ensureEmailRoutingRuleToWorker(){}',
		"@/lib/mailboxes/domain-addresses": 'export async function ensureMailboxDomainRouting(){}',
		"@/lib/booking/username": 'export async function ensureBookingUsername(){}',
	},
});
fixtures.push(registrationFixture);
const register = (await registrationFixture.import()).POST;
for (const usePasskey of [false, true]) test(`initial ${usePasskey ? "passkey" : "password"} registration requires setup authority even when DNS is skipped`, async () => {
	globalThis.setupTest = { env: { SETUP_SECRET: secret }, hasAdmin: false, rows: [] };
	const body = { domain: "example.com", username: "owner", resetEmail: "recovery@example.com", skipDns: true, usePasskey, ...(!usePasskey ? { password: "dummy-setup-password" } : {}) };
	assert.equal((await register(request(undefined, body))).status, 403);
	assert.equal(globalThis.setupTest.rows.length, 0);
	const response = await register(request(secret, body));
	assert.equal(response.status, 200, await response.clone().text());
	const result = await response.json();
	assert.equal(result.redirect, usePasskey ? "/setup/passkey" : "/login");
	const [user, mailbox] = globalThis.setupTest.rows;
	assert.equal(user.role, "admin");
	assert.equal(user.isPrimaryAdmin, true);
	assert.equal(mailbox.userId, user.id);
	assert.notEqual(user.passwordHash, body.password);
});
