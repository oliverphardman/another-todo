import { useState } from "react";
import { ScrollView, View } from "react-native";
import type { IconName } from "../domain/task-view";
import { AddTaskBar } from "./add-task-bar";
import { AppText } from "./app-text";
import { useContainer } from "./container-context";
import { useObservable } from "./hooks";
import { Icon, type IconGlyph } from "./icon";
import { PressableSurface } from "./pressable-surface";
import { useTheme } from "./theme-context";

const GLYPHS: Record<IconName, IconGlyph> = {
	important: "star",
	planned: "calendar",
	all: "all",
	tasks: "home",
	list: "list",
};

export interface SidebarProps {
	readonly onSelected: () => void;
}

export function Sidebar({ onSelected }: SidebarProps) {
	const { store, auth } = useContainer();
	const palette = useTheme();
	const state = useObservable(store);
	const [creating, setCreating] = useState(false);
	return (
		<View style={{ flex: 1, backgroundColor: palette.sidebar }} accessibilityLabel="Lists">
			<View style={{ flexDirection: "row", alignItems: "center", padding: 16 }}>
				<AppText size={18} weight="600" style={{ flex: 1, color: palette.accent }}>
					Another To Do
				</AppText>
				<PressableSurface
					accessibilityRole="button"
					accessibilityLabel="Sign out"
					onPress={() => void auth.signOut()}
					hoverColor={palette.sidebarHover}
					style={{ padding: 8, borderRadius: 4 }}
				>
					<Icon glyph="signOut" color={palette.textSecondary} />
				</PressableSurface>
			</View>
			<ScrollView>
				{state.views.map((view, index) => {
					const selected = state.selectedViewId === view.id;
					const count = store.taskCount(view);
					return (
						<View key={view.id}>
							{index === 4 ? (
								<View
									style={{
										height: 1,
										backgroundColor: palette.border,
										marginVertical: 8,
										marginHorizontal: 16,
									}}
								/>
							) : null}
							<PressableSurface
								accessibilityRole="button"
								accessibilityLabel={view.title}
								accessibilityState={{ selected }}
								onPress={() => {
									store.select(view.id);
									onSelected();
								}}
								hoverColor={palette.sidebarHover}
								style={{
									flexDirection: "row",
									alignItems: "center",
									paddingHorizontal: 16,
									paddingVertical: 11,
									backgroundColor: selected ? palette.sidebarSelected : undefined,
								}}
							>
								<Icon glyph={GLYPHS[view.icon]} color={palette.accent} />
								<AppText style={{ flex: 1, marginLeft: 14 }} weight={selected ? "600" : "400"}>
									{view.title}
								</AppText>
								{count === 0 ? null : (
									<AppText size={12} tone="secondary" accessibilityLabel={`${count} open`}>
										{count}
									</AppText>
								)}
							</PressableSurface>
						</View>
					);
				})}
			</ScrollView>
			<View
				style={{
					borderTopWidth: 1,
					borderTopColor: palette.border,
					padding: 8,
				}}
			>
				{creating ? (
					<AddTaskBar
						placeholder="New list"
						onSubmit={(name) => {
							store.addList(name);
							setCreating(false);
							onSelected();
						}}
					/>
				) : (
					<PressableSurface
						accessibilityRole="button"
						accessibilityLabel="Create a new list"
						onPress={() => setCreating(true)}
						hoverColor={palette.sidebarHover}
						style={{ flexDirection: "row", alignItems: "center", padding: 10 }}
					>
						<Icon glyph="plus" color={palette.accent} />
						<AppText style={{ marginLeft: 14 }}>New list</AppText>
					</PressableSurface>
				)}
			</View>
		</View>
	);
}
