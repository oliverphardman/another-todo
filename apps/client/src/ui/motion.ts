export interface Motion {
	readonly fillMs: number;
	readonly travelMs: number;
}

export const STANDARD_MOTION: Motion = { fillMs: 70, travelMs: 110 };

export const NO_MOTION: Motion = { fillMs: 0, travelMs: 0 };
