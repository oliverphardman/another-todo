import { EN_GB } from "./en-gb";
import { EN_US, type Messages } from "./en-us";

export const DEFAULT_LOCALE = "en-US";

export const CATALOGS: Readonly<Record<string, Messages>> = {
	"en-US": EN_US,
	"en-GB": EN_GB,
};

const BRITISH_ENGLISH = ["en-AU", "en-NZ", "en-IE", "en-IN", "en-ZA", "en-SG", "en-HK"];

export class LocaleResolver {
	static resolve(requested: readonly string[]): string {
		for (const tag of requested) {
			const match = LocaleResolver.match(tag);
			if (match !== null) {
				return match;
			}
		}
		return DEFAULT_LOCALE;
	}

	private static match(tag: string): string | null {
		const normalized = tag.replace("_", "-");
		const exact = Object.keys(CATALOGS).find(
			(locale) => locale.toLowerCase() === normalized.toLowerCase(),
		);
		if (exact !== undefined) {
			return exact;
		}
		const alias = BRITISH_ENGLISH.find(
			(locale) => locale.toLowerCase() === normalized.toLowerCase(),
		);
		if (alias !== undefined) {
			return "en-GB";
		}
		const language = normalized.split("-")[0]!.toLowerCase();
		return (
			Object.keys(CATALOGS).find((locale) => locale.split("-")[0]!.toLowerCase() === language) ??
			null
		);
	}
}
