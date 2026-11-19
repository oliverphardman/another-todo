export type Listener = () => void;

export class Observable<T> {
	private readonly listeners = new Set<Listener>();

	constructor(private current: T) {}

	get(): T {
		return this.current;
	}

	subscribe = (listener: Listener): (() => void) => {
		this.listeners.add(listener);
		return () => {
			this.listeners.delete(listener);
		};
	};

	protected set(value: T): void {
		this.current = value;
		for (const listener of [...this.listeners]) {
			listener();
		}
	}
}
