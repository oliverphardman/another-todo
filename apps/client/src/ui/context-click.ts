export type ContextClickHandler = (event: unknown) => void;

export function contextClickProps(handler: ContextClickHandler): object {
	return { onContextMenu: handler };
}
