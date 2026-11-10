export interface UpdateStatusResponse {
	currentVersion: string;
	mode: "manual";
	error?: string;
}

export interface MigrationStatusResponse {
	applied?: string[];
	error?: string;
	pending: string[];
	ready: boolean;
	unknown: string[];
}
