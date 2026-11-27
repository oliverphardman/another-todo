export interface ImageBand {
	readonly from: number;
	readonly to: number;
}

export interface ImageSampler {
	averageColor(url: string, band: ImageBand): Promise<string | null>;
}
