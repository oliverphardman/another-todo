import { View } from "react-native";
import type { ListChoiceGroup } from "../export/export-document-builder";
import { useI18n } from "../i18n/i18n-context";
import { Checkbox } from "./settings-controls";

export interface ExportListPickerProps {
	readonly choices: readonly ListChoiceGroup[];
	readonly selected: ReadonlySet<string>;
	readonly onChange: (selected: ReadonlySet<string>) => void;
}

const INDENT = 28;

export function ExportListPicker({ choices, selected, onChange }: ExportListPickerProps) {
	const { t } = useI18n();
	const box = (label: string, ids: readonly string[], heading?: string) => {
		const chosen = ids.filter((id) => selected.has(id)).length;
		const all = chosen === ids.length;
		return (
			<Checkbox
				label={label}
				heading={heading}
				checked={all}
				mixed={chosen > 0 && !all}
				onChange={() => {
					const next = new Set(selected);
					ids.forEach((id) => (all ? next.delete(id) : next.add(id)));
					onChange(next);
				}}
			/>
		);
	};
	return (
		<View accessibilityLabel={t("export.lists")}>
			{box(
				t("export.selectAll"),
				choices.flatMap((entry) => entry.lists.map((list) => list.id)),
			)}
			{choices.map(({ group, lists }) => (
				<View key={group?.id ?? ""}>
					{group === null
						? null
						: box(
								t("group.header", { name: group.name }),
								lists.map((list) => list.id),
								group.name,
							)}
					<View style={{ marginLeft: group === null ? 0 : INDENT }}>
						{lists.map((list) => (
							<View key={list.id}>{box(list.name, [list.id])}</View>
						))}
					</View>
				</View>
			))}
		</View>
	);
}
