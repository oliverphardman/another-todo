import { useContainer } from "./container-context";
import { useObservable } from "./hooks";
import { menuMetrics, type MenuMetrics } from "./menu-metrics";

export function useMenuMetrics(): MenuMetrics {
	const { menuStyle } = useObservable(useContainer().settings);
	return menuMetrics(menuStyle);
}
