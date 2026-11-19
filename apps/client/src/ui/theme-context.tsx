import { createContext, useContext, type ReactNode } from "react";
import { useColorScheme } from "react-native";
import { DARK, LIGHT, type Palette } from "./theme";

const ThemeContext = createContext<Palette>(LIGHT);

export function ThemeProvider({
	children,
	scheme,
}: {
	children: ReactNode;
	scheme?: "light" | "dark";
}) {
	const system = useColorScheme();
	const palette = (scheme ?? system) === "dark" ? DARK : LIGHT;
	return <ThemeContext.Provider value={palette}>{children}</ThemeContext.Provider>;
}

export function ThemeOverride({
	overrides,
	children,
}: {
	overrides: Partial<Palette>;
	children: ReactNode;
}) {
	const base = useTheme();
	return (
		<ThemeContext.Provider value={{ ...base, ...overrides }}>{children}</ThemeContext.Provider>
	);
}

export function useIsDark(): boolean {
	return useTheme() === DARK;
}

export function useTheme(): Palette {
	return useContext(ThemeContext);
}
