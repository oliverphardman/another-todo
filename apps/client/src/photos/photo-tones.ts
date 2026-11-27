import { ColorMath } from "../ui/color-math";
import type { Tone } from "../ui/list-theme";
import type { ImageBand, ImageSampler } from "./image-sampler";

export type ImageEdge = "top" | "bottom";

const BANDS: Readonly<Record<ImageEdge, ImageBand>> = {
	top: { from: 0.1, to: 0.35 },
	bottom: { from: 0.75, to: 1 },
};

const MIDDLE_BRIGHTNESS = 0.5;

export class PhotoTones {
	private readonly known = new Map<string, Tone>();

	constructor(private readonly sampler: ImageSampler) {}

	cached(photoId: string, edge: ImageEdge): Tone | null {
		return this.known.get(`${photoId}:${edge}`) ?? null;
	}

	async toneOf(photoId: string, url: string, edge: ImageEdge): Promise<Tone | null> {
		const known = this.cached(photoId, edge);
		if (known !== null) {
			return known;
		}
		const color = await this.sampler.averageColor(url, BANDS[edge]).catch(() => null);
		if (color === null) {
			return null;
		}
		const tone = ColorMath.brightness(color) < MIDDLE_BRIGHTNESS ? "dark" : "light";
		this.known.set(`${photoId}:${edge}`, tone);
		return tone;
	}
}
