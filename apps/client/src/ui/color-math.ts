export class ColorMath {
	static mix(color: string, other: string, ratio: number): string {
		const [r1, g1, b1] = ColorMath.channels(color);
		const [r2, g2, b2] = ColorMath.channels(other);
		const channel = (a: number, b: number) =>
			Math.round(a + (b - a) * ratio)
				.toString(16)
				.padStart(2, "0");
		return `#${channel(r1, r2)}${channel(g1, g2)}${channel(b1, b2)}`;
	}

	private static channels(color: string): [number, number, number] {
		const value = Number.parseInt(color.slice(1), 16);
		return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
	}
}
