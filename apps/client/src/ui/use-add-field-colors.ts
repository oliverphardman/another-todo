import { useEffect, useState } from "react";
import type { ImageEdge } from "../photos/photo-tones";
import { useContainer } from "./container-context";
import { useObservable } from "./hooks";
import { ListTheme, type FieldColors } from "./list-theme";
import { useTheme } from "./theme-context";

export function useAddFieldColors(edge: ImageEdge): FieldColors {
	const { store, photos, photoTones } = useContainer();
	const state = useObservable(store);
	useObservable(photos);
	const { addField, onAddField } = useTheme();
	const { theme } = store.settingsFor(state.selectedViewId);
	const photoId = theme?.type === "photo" ? theme.photoId : null;
	const url = photoId === null ? null : photos.urlFor(photoId);
	const [, setSampled] = useState("");
	useEffect(() => {
		if (photoId !== null && url !== null) {
			void photoTones.toneOf(photoId, url, edge).then((tone) => {
				setSampled(`${photoId}:${edge}:${tone}`);
			});
		}
	}, [photoTones, photoId, url, edge]);
	const tone = photoId === null || url === null ? null : photoTones.cached(photoId, edge);
	return tone === null ? { addField, onAddField } : ListTheme.photoField(tone);
}
