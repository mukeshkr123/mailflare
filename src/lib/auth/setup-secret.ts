import { timingSafeEqual } from "node:crypto";

export const SETUP_SECRET_HEADER = "X-Mailflare-Setup-Secret";

/** First-run authority is independent of DNS ownership and bot verification. */
export async function requireSetupSecret(
	env: Pick<CloudflareEnv, "SETUP_SECRET">,
	request: Request,
): Promise<Response | null> {
	const secret = env.SETUP_SECRET;
	const headers = { "Cache-Control": "no-store" };
	// 32–128 random bytes, hex encoded. Never accept a placeholder or whitespace.
	if (!secret || !/^(?:[a-fA-F0-9]{2}){32,128}$/.test(secret)) {
		return Response.json({ error: "Configure SETUP_SECRET with at least 32 random bytes encoded as hex before starting setup." }, { status: 503, headers });
	}
	const supplied = request.headers.get(SETUP_SECRET_HEADER) ?? "";
	if (supplied.length > 256) {
		return Response.json({ error: "Invalid setup secret" }, { status: 403, headers });
	}
	const encoder = new TextEncoder();
	const [expected, actual] = await Promise.all([
		crypto.subtle.digest("SHA-256", encoder.encode(secret)),
		crypto.subtle.digest("SHA-256", encoder.encode(supplied)),
	]);
	if (!timingSafeEqual(new Uint8Array(expected), new Uint8Array(actual))) {
		return Response.json({ error: "Invalid setup secret" }, { status: 403, headers });
	}
	return null;
}
