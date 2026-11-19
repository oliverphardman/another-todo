import { Linking } from "react-native";

export interface DeepLinks {
	open(url: string): Promise<void>;
	waitFor(prefix: string, timeoutMs: number): Promise<string | null>;
}

export class LinkingDeepLinks implements DeepLinks {
	open(url: string): Promise<void> {
		return Linking.openURL(url);
	}

	waitFor(prefix: string, timeoutMs: number): Promise<string | null> {
		return new Promise((resolve) => {
			const finish = (value: string | null) => {
				clearTimeout(timer);
				subscription.remove();
				resolve(value);
			};
			const timer = setTimeout(() => finish(null), timeoutMs);
			const subscription = Linking.addEventListener("url", ({ url }) => {
				if (url.startsWith(prefix)) {
					finish(url);
				}
			});
		});
	}
}
