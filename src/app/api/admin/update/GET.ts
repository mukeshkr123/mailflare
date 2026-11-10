import { NextResponse } from "next/server";
import { authorizeAdminRequest, getUpdateStatus } from "./utils";

export async function GET(request: Request) {
	const authorization = await authorizeAdminRequest(request);
	if ("error" in authorization) return authorization.error;
	return NextResponse.json(getUpdateStatus(), { headers: { "Cache-Control": "no-store" } });
}
