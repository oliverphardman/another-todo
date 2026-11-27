export type SaveOutcome = "saved" | "cancelled";

export interface SaveRequest {
	readonly name: string;
	readonly extension: string;
	readonly contentType: string;
	content(): Promise<Uint8Array>;
}

export interface FileSaver {
	readonly available: boolean;
	save(request: SaveRequest): Promise<SaveOutcome>;
}
