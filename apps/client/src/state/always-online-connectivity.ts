import type { Connectivity } from "./connectivity";

export class AlwaysOnlineConnectivity implements Connectivity {
	isOnline(): boolean {
		return true;
	}

	subscribe(): () => void {
		return () => undefined;
	}
}
