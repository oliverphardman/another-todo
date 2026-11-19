import { getLocales } from "expo-localization";
import { LocaleResolver } from "./locales";

export class DeviceLocale {
	static resolved(): string {
		return LocaleResolver.resolve(DeviceLocale.preferred());
	}

	static preferred(): string[] {
		return getLocales().map((locale) => locale.languageTag);
	}
}
