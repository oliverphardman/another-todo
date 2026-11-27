import type { FileSaver, SaveOutcome, SaveRequest } from "./file-saver";

const RELEASE_AFTER_MS = 60_000;

export interface WritableFile {
	write(data: Blob): Promise<void>;
	close(): Promise<void>;
	abort(): Promise<void>;
}

export interface SaveFileHandle {
	createWritable(): Promise<WritableFile>;
}

export interface SavePickerOptions {
	readonly suggestedName: string;
	readonly types: readonly { readonly accept: Readonly<Record<string, readonly string[]>> }[];
}

export interface SavePickerHost {
	showSaveFilePicker?: (options: SavePickerOptions) => Promise<SaveFileHandle>;
}

export class BrowserFileSaver implements FileSaver {
	readonly available = true;

	constructor(private readonly host: () => SavePickerHost = () => window as SavePickerHost) {}

	async save(request: SaveRequest): Promise<SaveOutcome> {
		const host = this.host();
		if (host.showSaveFilePicker === undefined) {
			return BrowserFileSaver.download(request);
		}
		let handle: SaveFileHandle;
		try {
			handle = await host.showSaveFilePicker({
				suggestedName: request.name,
				types: [{ accept: { [request.contentType]: [`.${request.extension}`] } }],
			});
		} catch (error) {
			return (error as Error).name === "AbortError"
				? "cancelled"
				: BrowserFileSaver.download(request);
		}
		const writable = await handle.createWritable();
		try {
			await writable.write(await BrowserFileSaver.blob(request));
		} catch (error) {
			await writable.abort();
			throw error;
		}
		await writable.close();
		return "saved";
	}

	private static async blob({ content, contentType }: SaveRequest): Promise<Blob> {
		return new Blob([(await content()) as Uint8Array<ArrayBuffer>], { type: contentType });
	}

	private static async download(request: SaveRequest): Promise<SaveOutcome> {
		const url = URL.createObjectURL(await BrowserFileSaver.blob(request));
		const link = document.createElement("a");
		link.href = url;
		link.download = request.name;
		document.body.appendChild(link);
		link.click();
		link.remove();
		setTimeout(() => URL.revokeObjectURL(url), RELEASE_AFTER_MS);
		return "saved";
	}
}
