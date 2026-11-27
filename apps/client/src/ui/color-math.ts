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

	static luminance(color: string): number {
		const [r, g, b] = ColorMath.channels(color).map((value) => {
			const scaled = value / 255;
			return scaled <= 0.03928 ? scaled / 12.92 : ((scaled + 0.055) / 1.055) ** 2.4;
		}) as [number, number, number];
		return 0.2126 * r + 0.7152 * g + 0.0722 * b;
	}

	static brightness(color: string): number {
		const [r, g, b] = ColorMath.channels(color);
		return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
	}

	static contrast(a: string, b: string): number {
		const [light, dark] = [ColorMath.luminance(a), ColorMath.luminance(b)].sort(
			(x, y) => y - x,
		) as [number, number];
		return (light + 0.05) / (dark + 0.05);
	}

	static readableOn(background: string): string {
		return ColorMath.contrast(background, "#ffffff") >= ColorMath.contrast(background, "#1b1a19")
			? "#ffffff"
			: "#1b1a19";
	}

	static ensureContrast(color: string, against: string, minimum: number, towards: string): string {
		let result = color;
		for (let step = 1; step <= 20 && ColorMath.contrast(result, against) < minimum; step += 1) {
			result = ColorMath.mix(color, towards, step * 0.05);
		}
		return result;
	}

	private static channels(color: string): [number, number, number] {
		const value = Number.parseInt(color.slice(1), 16);
		return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
	}
}
