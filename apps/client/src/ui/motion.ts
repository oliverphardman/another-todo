export interface Motion {
	readonly pressMs: number;
	readonly fillMs: number;
	readonly travelMs: number;
	readonly slideMs: number;
}

export const STANDARD_MOTION: Motion = { pressMs: 90, fillMs: 180, travelMs: 220, slideMs: 180 };

export const NO_MOTION: Motion = { pressMs: 0, fillMs: 0, travelMs: 0, slideMs: 0 };
