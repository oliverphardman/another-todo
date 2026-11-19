import { createContext, useContext, useMemo, type ReactNode } from "react";
import { I18n } from "./i18n";

const I18nContext = createContext<I18n>(new I18n());

export function I18nProvider({ locale, children }: { locale?: string; children: ReactNode }) {
	const i18n = useMemo(() => new I18n(locale), [locale]);
	return <I18nContext.Provider value={i18n}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18n {
	return useContext(I18nContext);
}
