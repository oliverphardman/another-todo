import { useContainer } from "./container-context";
import { useObservable } from "./hooks";
import { ListTheme, type ResolvedTheme } from "./list-theme";
import { useIsDark } from "./theme-context";

export function useListTheme(): ResolvedTheme {
	const { store, photos } = useContainer();
	const state = useObservable(store);
	useObservable(photos);
	const dark = useIsDark();
	const { theme } = store.settingsFor(state.selectedViewId);
	const photoUrl = theme?.type === "photo" ? photos.urlFor(theme.photoId) : null;
	return ListTheme.resolve(theme, photoUrl, dark);
}
