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
vi.mock("expo-print", () => ({ printAsync: async () => undefined }));
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
