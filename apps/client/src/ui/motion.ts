export interface Motion {
	readonly fillMs: number;
	readonly travelMs: number;
	readonly slideMs: number;
}

export const STANDARD_MOTION: Motion = { fillMs: 120, travelMs: 220, slideMs: 180 };

export const NO_MOTION: Motion = { fillMs: 0, travelMs: 0, slideMs: 0 };
