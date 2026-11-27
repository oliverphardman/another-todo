import { ViewDefaults } from "../domain/view-settings";
import { ThemeImage } from "../photos/theme-image";
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
	const image = ThemeImage.of(theme, photos);
	return ListTheme.resolve(theme, image, dark, ViewDefaults.themeColor(state.selectedViewId));
}
