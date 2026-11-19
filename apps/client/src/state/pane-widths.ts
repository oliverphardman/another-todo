import type { KeyValueStore } from "../storage/key-value-store";
import { Observable } from "./observable";

export type Pane = "sidebar" | "detail";

export interface PaneWidthState {
	readonly sidebar: number | null;
	readonly detail: number | null;
}

const KEY = "atd.paneWidths";

export const PANE_LIMITS: Record<Pane, { readonly min: number; readonly max: number }> = {
	sidebar: { min: 200, max: 420 },
	detail: { min: 260, max: 480 },
};

export class PaneWidths extends Observable<PaneWidthState> {
	constructor(private readonly storage: KeyValueStore) {
		super({ sidebar: null, detail: null });
	}

	static clamp(pane: Pane, width: number): number {
		const { min, max } = PANE_LIMITS[pane];
		return Math.round(Math.min(max, Math.max(min, width)));
	}

	async load(): Promise<void> {
		const raw = await this.storage.get(KEY);
		if (raw === null) {
			return;
		}
		try {
			const saved = JSON.parse(raw) as Partial<Record<Pane, unknown>>;
			this.set({
				sidebar:
					typeof saved.sidebar === "number" ? PaneWidths.clamp("sidebar", saved.sidebar) : null,
				detail: typeof saved.detail === "number" ? PaneWidths.clamp("detail", saved.detail) : null,
			});
		} catch {
			return;
		}
	}

	resize(pane: Pane, width: number): void {
		this.set({ ...this.get(), [pane]: PaneWidths.clamp(pane, width) });
	}

	reset(pane: Pane): void {
		this.set({ ...this.get(), [pane]: null });
	}

	async save(): Promise<void> {
		await this.storage.set(KEY, JSON.stringify(this.get()));
	}
}
