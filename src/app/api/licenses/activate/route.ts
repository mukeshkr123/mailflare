import { NextResponse } from "next/server";
import { getEnv } from "@/lib/cloudflare";
import { requireLicenseAdmin } from "../utils";

export async function POST(request: Request) {
	const forbidden = await requireLicenseAdmin(getEnv(), request);
	if (forbidden) return forbidden;
	return NextResponse.json({ error: "This self-hosted installation includes all features. License activation is not required." }, {
		status: 410,
		headers: { "Cache-Control": "no-store" },
	});
}
