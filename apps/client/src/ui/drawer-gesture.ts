export type DrawerSide = "left" | "right";

export interface Drag {
	readonly dx: number;
	readonly dy: number;
	readonly vx: number;
}

export class DrawerGesture {
	static readonly SLOP = 10;
	static readonly DISTANCE = 60;
	static readonly FLICK = 0.5;

	constructor(private readonly side: DrawerSide) {}

	claims(open: boolean, drag: Drag): boolean {
		const horizontal =
			Math.abs(drag.dx) > DrawerGesture.SLOP && Math.abs(drag.dx) > Math.abs(drag.dy) * 1.5;
		return horizontal && this.progressMade(open, drag.dx) > 0;
	}

	progress(open: boolean, dx: number, width: number): number {
		const moved = (open ? 1 : 0) + this.towardsOpen(dx) / width;
		return Math.max(0, Math.min(1, moved));
	}

	endsOpen(open: boolean, drag: Drag): boolean {
		const travelled = this.progressMade(open, drag.dx);
		const flicked =
			travelled > DrawerGesture.SLOP && this.progressMade(open, drag.vx) > DrawerGesture.FLICK;
		return travelled >= DrawerGesture.DISTANCE || flicked ? !open : open;
	}

	private progressMade(open: boolean, movement: number): number {
		return open ? -this.towardsOpen(movement) : this.towardsOpen(movement);
	}

	private towardsOpen(movement: number): number {
		return this.side === "left" ? movement : -movement;
	}
}
