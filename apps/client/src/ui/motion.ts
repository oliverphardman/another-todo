export interface Motion {
	readonly fillMs: number;
	readonly travelMs: number;
}

export const STANDARD_MOTION: Motion = { fillMs: 220, travelMs: 360 };

export const NO_MOTION: Motion = { fillMs: 0, travelMs: 0 };
