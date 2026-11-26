import { cleanup, configure } from "@testing-library/react";
import { afterEach, vi } from "vitest";

configure({ asyncUtilTimeout: 5000 });

vi.mock("expo-auth-session", () => ({
	AuthRequest: class {},
	ResponseType: { Code: "code" },
	TokenTypeHint: { RefreshToken: "refresh_token" },
	makeRedirectUri: () => "anothertodo://auth/callback",
}));
vi.mock("expo-web-browser", () => ({
	maybeCompleteAuthSession: () => undefined,
	openAuthSessionAsync: async () => ({ type: "cancel" }),
}));
vi.mock("@react-native-community/datetimepicker", () => ({
	default: (props: { onChange: unknown; value: Date }) => {
		(globalThis as { __datePicker?: unknown }).__datePicker = props;
		return null;
	},
}));
vi.mock("expo-audio", () => ({
	createAudioPlayer: () => ({ seekTo: async () => undefined, play: () => undefined }),
}));
vi.mock("expo-image-picker", () => ({
	launchImageLibraryAsync: async () => ({ canceled: true, assets: null }),
}));
vi.mock("expo-document-picker", () => ({
	getDocumentAsync: async () => ({ canceled: true, assets: null }),
}));
vi.mock("expo-notifications", () => ({
	getPermissionsAsync: async () => ({ granted: false, canAskAgain: true }),
	requestPermissionsAsync: async () => ({ granted: false, canAskAgain: false }),
	scheduleNotificationAsync: async () => "id",
	cancelScheduledNotificationAsync: async () => undefined,
	cancelAllScheduledNotificationsAsync: async () => undefined,
	setNotificationHandler: () => undefined,
	setNotificationChannelAsync: async () => undefined,
	SchedulableTriggerInputTypes: { DATE: "date" },
	AndroidImportance: { HIGH: 4 },
}));
vi.mock("expo-print", () => ({ printAsync: async () => undefined }));
vi.mock("expo-status-bar", async () => {
	const { createElement } = await import("react");
	return {
		StatusBar: ({ style }: { style: string }) =>
			createElement("div", { "data-testid": "status-bar", "data-tone": style }),
	};
});
vi.mock("react-native-safe-area-context", async () => {
	const { createContext, createElement, Fragment } = await import("react");
	return {
		SafeAreaInsetsContext: createContext(null),
		SafeAreaProvider: ({ children }: { children: unknown }) =>
			createElement(Fragment, null, children as never),
	};
});
vi.mock("expo-localization", () => ({
	getLocales: vi.fn(() => [{ languageTag: "en-US" }]),
}));
vi.mock("expo-secure-store", () => ({
	getItemAsync: async () => null,
	setItemAsync: async () => undefined,
	deleteItemAsync: async () => undefined,
}));
vi.mock("@react-native-async-storage/async-storage", () => ({
	default: {
		getItem: async () => null,
		setItem: async () => undefined,
		removeItem: async () => undefined,
	},
}));
vi.mock("@react-native-community/netinfo", () => ({
	default: { addEventListener: () => () => undefined },
}));

afterEach(() => {
	cleanup();
});
