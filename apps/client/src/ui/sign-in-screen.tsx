import { View } from "react-native";
import type { IdentityProvider } from "../auth/authorization-server";
import { AppText } from "./app-text";
import { useContainer } from "./container-context";
import { Icon } from "./icon";
import { PressableSurface } from "./pressable-surface";
import { useTheme } from "./theme-context";

export interface SignInScreenProps {
	readonly providers: readonly IdentityProvider[];
}

export function SignInScreen({ providers }: SignInScreenProps) {
	const { auth } = useContainer();
	const palette = useTheme();
	const button = {
		alignItems: "center",
		paddingVertical: 12,
		paddingHorizontal: 20,
		borderRadius: 4,
		marginTop: 12,
		minWidth: 260,
	} as const;
	return (
		<View
			style={{
				flex: 1,
				alignItems: "center",
				justifyContent: "center",
				backgroundColor: palette.background,
				padding: 24,
			}}
		>
			<Icon glyph="check" size={64} color={palette.onAccent} />
			<AppText role="heading" size={32} weight="600" tone="onAccent" style={{ marginTop: 16 }}>
				Another To Do
			</AppText>
			<AppText tone="onAccent" style={{ marginTop: 8, marginBottom: 24, textAlign: "center" }}>
				Get things done, wherever you are.
			</AppText>
			<PressableSurface
				accessibilityRole="button"
				accessibilityLabel="Sign in"
				onPress={() => void auth.signIn()}
				style={{ ...button, backgroundColor: palette.surface }}
			>
				<AppText weight="600" style={{ color: palette.accent }}>
					Sign in
				</AppText>
			</PressableSurface>
			{providers.map((provider) => (
				<PressableSurface
					key={provider}
					accessibilityRole="button"
					accessibilityLabel={`Continue with ${provider}`}
					onPress={() => void auth.signIn(provider)}
					style={{ ...button, backgroundColor: palette.surface }}
				>
					<AppText weight="600">{`Continue with ${provider}`}</AppText>
				</PressableSurface>
			))}
		</View>
	);
}
