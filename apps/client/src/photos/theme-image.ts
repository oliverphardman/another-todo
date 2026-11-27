import type { ImageSourcePropType } from "react-native";
import type { ThemeSetting } from "../domain/view-settings";
import type { PhotoLibrary } from "./photo-library";
import { PRESET_PHOTOS } from "./preset-photos";

export class ThemeImage {
	static of(theme: ThemeSetting | null, library: PhotoLibrary): ImageSourcePropType | null {
		if (theme?.type === "preset") {
			return PRESET_PHOTOS.find((preset) => preset.id === theme.presetId)?.image ?? null;
		}
		if (theme?.type === "photo") {
			const uri = library.urlFor(theme.photoId);
			return uri === null ? null : { uri };
		}
		return null;
	}
}
