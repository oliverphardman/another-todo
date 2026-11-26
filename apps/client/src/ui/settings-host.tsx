import { createContext, useContext, useMemo, type ReactNode } from "react";
import { View } from "react-native";
import { Observable } from "../state/observable";
import { useObservable } from "./hooks";
import { SettingsDialog } from "./settings-dialog";

export class SettingsController extends Observable<boolean> {
	constructor() {
		super(false);
	}

	open(): void {
		this.set(true);
	}

	close(): void {
		this.set(false);
	}
}

const SettingsContext = createContext<SettingsController>(new SettingsController());

export function useSettingsController(): SettingsController {
	return useContext(SettingsContext);
}

export function SettingsHost({ children }: { children: ReactNode }) {
	const controller = useMemo(() => new SettingsController(), []);
	const open = useObservable(controller);
	return (
		<SettingsContext.Provider value={controller}>
			<View style={{ flex: 1 }}>
				{children}
				{open ? <SettingsDialog onClose={() => controller.close()} /> : null}
			</View>
		</SettingsContext.Provider>
	);
}
