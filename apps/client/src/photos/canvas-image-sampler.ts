import type { ImageBand, ImageSampler } from "./image-sampler";

const SIZE = 32;

export interface CanvasEnvironment {
	fetch(url: string, init: RequestInit): Promise<Response>;
	decode(blob: Blob): Promise<CanvasImageSource>;
	createCanvas(): HTMLCanvasElement;
}

const BROWSER: CanvasEnvironment = {
	fetch: (url, init) => fetch(url, init),
	decode: (blob) => createImageBitmap(blob),
	createCanvas: () => document.createElement("canvas"),
};

export class CanvasImageSampler implements ImageSampler {
	constructor(private readonly environment: CanvasEnvironment = BROWSER) {}

	async averageColor(url: string, band: ImageBand): Promise<string | null> {
		const response = await this.environment.fetch(url, { mode: "cors", cache: "reload" });
		if (!response.ok) {
			return null;
		}
		const image = await this.environment.decode(await response.blob());
		const canvas = this.environment.createCanvas();
		canvas.width = SIZE;
		canvas.height = SIZE;
		const context = canvas.getContext("2d");
		if (context === null) {
			return null;
		}
		context.drawImage(image, 0, 0, SIZE, SIZE);
		const top = Math.floor(band.from * SIZE);
		const height = Math.ceil(band.to * SIZE) - top;
		return CanvasImageSampler.average(context.getImageData(0, top, SIZE, height).data);
	}

	private static average(pixels: Uint8ClampedArray): string {
		const totals = [0, 0, 0];
		for (let offset = 0; offset < pixels.length; offset += 4) {
			for (let channel = 0; channel < 3; channel += 1) {
				totals[channel]! += pixels[offset + channel]!;
			}
		}
		const count = pixels.length / 4;
		const channels = totals.map((total) =>
			Math.round(total / count)
				.toString(16)
				.padStart(2, "0"),
		);
		return `#${channels.join("")}`;
	}
}
