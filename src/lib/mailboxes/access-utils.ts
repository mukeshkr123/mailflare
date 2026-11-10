import type { AppDatabase } from "@/db";
import { getSelfHostedEntitlements } from "@/lib/licenses/features";

/** Feature availability does not grant access: ownership and sharing ACLs still apply. */
export async function isTeamMailboxSharingEnabled(_db: AppDatabase): Promise<boolean> {
	return getSelfHostedEntitlements().canShareMailboxes;
}
