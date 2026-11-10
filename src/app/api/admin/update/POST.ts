import { NextResponse } from "next/server";
import { authorizeAdminRequest } from "./utils";

/** Kept for older clients; this installation never dispatches update workflows. */
export async function POST(request: Request) {
	const authorization = await authorizeAdminRequest(request);
	if ("error" in authorization) return authorization.error;
	return NextResponse.json({ error: "Automatic updates have been removed. Review upstream changes and deploy manually." }, {
		status: 410,
		headers: { "Cache-Control": "no-store" },
	});
}
