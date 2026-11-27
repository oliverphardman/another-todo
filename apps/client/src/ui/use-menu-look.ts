import { useContainer } from "./container-context";
import { useObservable } from "./hooks";
import { menuLook, type MenuLook } from "./menu-look";

export function useMenuLook(): MenuLook {
	const { menuStyle } = useObservable(useContainer().settings);
	return menuLook(menuStyle);
}
