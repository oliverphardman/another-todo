import { useCallback, useEffect, useState } from "react";
import { View } from "react-native";
import { TextField } from "./text-field";
import type { MessageKey } from "../i18n/en-us";
import { useI18n } from "../i18n/i18n-context";
import { ShareErrors } from "../shares/share-errors";
import type { ShareMember } from "../shares/share-gateway";
import { AppText } from "./app-text";
import { useContainer } from "./container-context";
import { Icon } from "./icon";
import { PressableSurface } from "./pressable-surface";
import { fontStyle } from "./typeface";
import { useTheme } from "./theme-context";

export interface SharePanelProps {
	readonly listId: string;
	readonly onClose: () => void;
}

export function SharePanel({ listId, onClose }: SharePanelProps) {
	const { shares } = useContainer();
	const { t } = useI18n();
	const palette = useTheme();
	const [members, setMembers] = useState<readonly ShareMember[]>([]);
	const [email, setEmail] = useState("");
	const [error, setError] = useState<MessageKey | null>(null);
	const attempt = useCallback(async (action: () => Promise<void>) => {
		try {
			await action();
			setError(null);
		} catch (failure) {
			setError(ShareErrors.keyFor(failure));
		}
	}, []);
	useEffect(() => {
		void attempt(async () => setMembers(await shares.list(listId)));
	}, [attempt, shares, listId]);
	const add = () =>
		attempt(async () => {
			if (email.trim().length === 0) {
				return;
			}
			const member = await shares.add(listId, email.trim());
			setMembers((current) => [...current.filter((entry) => entry.id !== member.id), member]);
			setEmail("");
		});
	const remove = (member: ShareMember) =>
		attempt(async () => {
			await shares.remove(listId, member.id);
			setMembers((current) => current.filter((entry) => entry.id !== member.id));
		});
	return (
		<View style={{ padding: 12 }} accessibilityLabel={t("share.title")}>
			<View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
				<AppText weight="600" style={{ flex: 1 }}>
					{t("share.title")}
				</AppText>
				<PressableSurface
					accessibilityRole="button"
					accessibilityLabel={t("share.close")}
					onPress={onClose}
					style={{ padding: 4 }}
				>
					<Icon glyph="close" size={16} color={palette.textSecondary} />
				</PressableSurface>
			</View>
			{members.length === 0 ? (
				<AppText size={13} tone="secondary" style={{ marginBottom: 8 }}>
					{t("share.empty")}
				</AppText>
			) : (
				members.map((member) => (
					<View
						key={member.id}
						style={{ flexDirection: "row", alignItems: "center", minHeight: 36 }}
					>
						<Icon glyph="people" size={16} color={palette.accent} />
						<AppText size={14} style={{ flex: 1, marginLeft: 10 }}>
							{member.email}
						</AppText>
						<PressableSurface
							accessibilityRole="button"
							accessibilityLabel={t("share.remove", { email: member.email })}
							onPress={() => void remove(member)}
							style={{ padding: 6 }}
						>
							<Icon glyph="close" size={14} color={palette.textSecondary} />
						</PressableSurface>
					</View>
				))
			)}
			<View style={{ flexDirection: "row", alignItems: "center", marginTop: 4 }}>
				<TextField
					accessibilityLabel={t("share.email")}
					placeholder={t("share.email")}
					placeholderTextColor={palette.textSecondary}
					autoCapitalize="none"
					keyboardType="email-address"
					value={email}
					onChangeText={setEmail}
					onSubmitEditing={() => void add()}
					style={
						{
							flex: 1,
							...fontStyle(),
							fontSize: 14,
							color: palette.text,
							borderWidth: 1,
							borderColor: palette.border,
							borderRadius: 4,
							paddingHorizontal: 8,
							paddingVertical: 6,
							outlineStyle: "none",
						} as object
					}
				/>
				<PressableSurface
					accessibilityRole="button"
					accessibilityLabel={t("share.add")}
					onPress={() => void add()}
					style={{ paddingHorizontal: 12, paddingVertical: 6 }}
				>
					<AppText weight="600" style={{ color: palette.accent }}>
						{t("share.add")}
					</AppText>
				</PressableSurface>
			</View>
			{error === null ? null : (
				<AppText size={12} tone="danger" style={{ marginTop: 6 }}>
					{t(error)}
				</AppText>
			)}
		</View>
	);
}
