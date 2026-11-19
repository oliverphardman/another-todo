import NetInfo from "@react-native-community/netinfo";
import type { Listener } from "./observable";

export interface Connectivity {
	isOnline(): boolean;
	subscribe(listener: Listener): () => void;
}

export class NetInfoConnectivity implements Connectivity {
	private online = true;
	private readonly listeners = new Set<Listener>();
	private unsubscribe: (() => void) | null = null;

	isOnline(): boolean {
		return this.online;
	}

	subscribe(listener: Listener): () => void {
		this.listeners.add(listener);
		this.unsubscribe ??= NetInfo.addEventListener((state) => {
			const online = state.isConnected !== false && state.isInternetReachable !== false;
			if (online !== this.online) {
				this.online = online;
				for (const registered of [...this.listeners]) {
					registered();
				}
			}
		});
		return () => {
			this.listeners.delete(listener);
			if (this.listeners.size === 0) {
				this.unsubscribe?.();
				this.unsubscribe = null;
			}
		};
	}
}
