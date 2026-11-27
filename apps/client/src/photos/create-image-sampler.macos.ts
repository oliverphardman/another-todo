import { NativeModules } from "react-native";
import type { ImageSampler } from "./image-sampler";
import { NativeImageSampler, type ImageModule } from "./native-image-sampler";

export function createImageSampler(): ImageSampler {
	return new NativeImageSampler(NativeModules.AnotherToDoImages as ImageModule | undefined);
}
