import type { ImageSourcePropType } from "react-native";
import aurora from "../../assets/themes/aurora.jpg";
import auroraThumbnail from "../../assets/themes/aurora-thumbnail.jpg";
import mountain from "../../assets/themes/mountain.jpg";
import mountainThumbnail from "../../assets/themes/mountain-thumbnail.jpg";
import forest from "../../assets/themes/forest.jpg";
import forestThumbnail from "../../assets/themes/forest-thumbnail.jpg";
import coast from "../../assets/themes/coast.jpg";
import coastThumbnail from "../../assets/themes/coast-thumbnail.jpg";
import desert from "../../assets/themes/desert.jpg";
import desertThumbnail from "../../assets/themes/desert-thumbnail.jpg";
import wave from "../../assets/themes/wave.jpg";
import waveThumbnail from "../../assets/themes/wave-thumbnail.jpg";
import fern from "../../assets/themes/fern.jpg";
import fernThumbnail from "../../assets/themes/fern-thumbnail.jpg";
import bridge from "../../assets/themes/bridge.jpg";
import bridgeThumbnail from "../../assets/themes/bridge-thumbnail.jpg";
import lighthouse from "../../assets/themes/lighthouse.jpg";
import lighthouseThumbnail from "../../assets/themes/lighthouse-thumbnail.jpg";
import lotus from "../../assets/themes/lotus.jpg";
import lotusThumbnail from "../../assets/themes/lotus-thumbnail.jpg";
import type { MessageKey } from "../i18n/en-us";
import type { Tone } from "../ui/list-theme";
import type { ImageEdge } from "./photo-tones";

export interface PresetPhoto {
	readonly id: string;
	readonly nameKey: MessageKey;
	readonly image: ImageSourcePropType;
	readonly thumbnail: ImageSourcePropType;
	readonly tones: Readonly<Record<ImageEdge, Tone>>;
}

export const PRESET_PHOTOS: readonly PresetPhoto[] = [
	{
		id: "aurora",
		nameKey: "preset.aurora",
		image: aurora,
		thumbnail: auroraThumbnail,
		tones: { top: "dark", bottom: "dark" },
	},
	{
		id: "mountain",
		nameKey: "preset.mountain",
		image: mountain,
		thumbnail: mountainThumbnail,
		tones: { top: "light", bottom: "light" },
	},
	{
		id: "forest",
		nameKey: "preset.forest",
		image: forest,
		thumbnail: forestThumbnail,
		tones: { top: "dark", bottom: "dark" },
	},
	{
		id: "coast",
		nameKey: "preset.coast",
		image: coast,
		thumbnail: coastThumbnail,
		tones: { top: "light", bottom: "dark" },
	},
	{
		id: "desert",
		nameKey: "preset.desert",
		image: desert,
		thumbnail: desertThumbnail,
		tones: { top: "light", bottom: "light" },
	},
	{
		id: "wave",
		nameKey: "preset.wave",
		image: wave,
		thumbnail: waveThumbnail,
		tones: { top: "light", bottom: "dark" },
	},
	{
		id: "fern",
		nameKey: "preset.fern",
		image: fern,
		thumbnail: fernThumbnail,
		tones: { top: "dark", bottom: "dark" },
	},
	{
		id: "bridge",
		nameKey: "preset.bridge",
		image: bridge,
		thumbnail: bridgeThumbnail,
		tones: { top: "light", bottom: "dark" },
	},
	{
		id: "lighthouse",
		nameKey: "preset.lighthouse",
		image: lighthouse,
		thumbnail: lighthouseThumbnail,
		tones: { top: "dark", bottom: "dark" },
	},
	{
		id: "lotus",
		nameKey: "preset.lotus",
		image: lotus,
		thumbnail: lotusThumbnail,
		tones: { top: "dark", bottom: "dark" },
	},
];
