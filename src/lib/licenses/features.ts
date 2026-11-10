import type { LicenseEntitlements } from "./types";

/** This AGPL self-hosted distribution includes every implemented feature. */
export function getSelfHostedEntitlements(): LicenseEntitlements {
	return {
		plan: "community",
		canCustomizeBranding: true,
		canManageAccounts: true,
		canShareMailboxes: true,
		accountSeatLimit: null,
		canForwardEmail: true,
	};
}
