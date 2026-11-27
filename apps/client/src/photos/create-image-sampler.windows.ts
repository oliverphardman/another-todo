import type { ImageSampler } from "./image-sampler";
import { NativeImageSampler } from "./native-image-sampler";

export function createImageSampler(): ImageSampler {
	return new NativeImageSampler(null);
}
