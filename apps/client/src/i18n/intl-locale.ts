import { LocaleResolver } from "./locales";

export class IntlLocale {
	static resolved(): string {
		return LocaleResolver.resolve([new Intl.DateTimeFormat().resolvedOptions().locale]);
	}
}
