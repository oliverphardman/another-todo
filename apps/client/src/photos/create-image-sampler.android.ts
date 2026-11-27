import { requireOptionalNativeModule } from "expo";
import type { ImageSampler } from "./image-sampler";
import { NativeImageSampler, type ImageModule } from "./native-image-sampler";

export function createImageSampler(): ImageSampler {
	return new NativeImageSampler(requireOptionalNativeModule<ImageModule>("AnotherToDoImages"));
}
