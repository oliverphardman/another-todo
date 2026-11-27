import type { ImageBand, ImageSampler } from "./image-sampler";

export interface ImageModule {
	averageColor(url: string, from: number, to: number): Promise<string | null>;
}

export class NativeImageSampler implements ImageSampler {
	constructor(private readonly module: ImageModule | null | undefined) {}

	async averageColor(url: string, { from, to }: ImageBand): Promise<string | null> {
		return this.module?.averageColor(url, from, to) ?? null;
	}
}
