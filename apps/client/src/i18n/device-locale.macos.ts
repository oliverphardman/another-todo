import { IntlLocale } from "./intl-locale";

export class DeviceLocale {
	static resolved(): string {
		return IntlLocale.resolved();
	}
}
