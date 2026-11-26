import { describe, expect, it } from "vitest";
import { DrawerGesture } from "../src/ui/drawer-gesture";

const drag = (dx: number, dy = 0, vx = 0) => ({ dx, dy, vx });

describe("DrawerGesture", () => {
	const left = new DrawerGesture("left");
	const right = new DrawerGesture("right");

	it("claims only mostly horizontal drags in the direction that would move the drawer", () => {
		expect(left.claims(false, drag(20, 2))).toBe(true);
		expect(left.claims(false, drag(-20, 2))).toBe(false);
		expect(left.claims(true, drag(-20, 2))).toBe(true);
		expect(left.claims(true, drag(20, 2))).toBe(false);
		expect(right.claims(true, drag(20, 2))).toBe(true);
		expect(right.claims(false, drag(-20, 2))).toBe(true);
		expect(left.claims(false, drag(8, 0))).toBe(false);
		expect(left.claims(false, drag(40, 30))).toBe(false);
	});

	it("follows the finger between closed and open", () => {
		expect(left.progress(false, 100, 400)).toBe(0.25);
		expect(left.progress(false, -50, 400)).toBe(0);
		expect(left.progress(false, 900, 400)).toBe(1);
		expect(left.progress(true, -100, 400)).toBe(0.75);
		expect(right.progress(true, 100, 400)).toBe(0.75);
		expect(right.progress(false, -100, 400)).toBe(0.25);
	});

	it("changes state after a long drag or a quick flick, and otherwise springs back", () => {
		expect(left.endsOpen(false, drag(60))).toBe(true);
		expect(left.endsOpen(false, drag(59))).toBe(false);
		expect(left.endsOpen(false, drag(30, 0, 0.8))).toBe(true);
		expect(left.endsOpen(false, drag(5, 0, 0.8))).toBe(false);
		expect(left.endsOpen(false, drag(30, 0, -0.8))).toBe(false);
		expect(left.endsOpen(true, drag(-80))).toBe(false);
		expect(left.endsOpen(true, drag(-20))).toBe(true);
		expect(right.endsOpen(true, drag(80))).toBe(false);
		expect(right.endsOpen(true, drag(30, 0, 0.8))).toBe(false);
	});
});
