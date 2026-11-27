import { CanvasImageSampler } from "./canvas-image-sampler";
import type { ImageSampler } from "./image-sampler";

export function createImageSampler(): ImageSampler {
	return new CanvasImageSampler();
}
