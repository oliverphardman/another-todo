import { Settings } from "./env";
import type { Env } from "./platform";

const WEB_PROTOCOLS = ["http:", "https:"];

export class MediaAddress {
	static from(env: Env): URL | null {
		const value = new Settings(env).optional("MEDIA_PUBLIC_URL");
		if (value === null) {
			return null;
		}
		const address = URL.canParse(value) ? new URL(value) : null;
		if (
			address === null ||
			!WEB_PROTOCOLS.includes(address.protocol) ||
			address.search !== "" ||
			address.hash !== ""
		) {
			throw new Error("MEDIA_PUBLIC_URL must be an http or https address");
		}
		return address;
	}
}
