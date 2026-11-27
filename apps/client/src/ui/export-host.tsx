import { createContext, useContext, useMemo, type ReactNode } from "react";
import { View } from "react-native";
import type { TaskView } from "../domain/task-view";
import { Observable } from "../state/observable";
import { useContainer } from "./container-context";
import { ExportDialog } from "./export-dialog";
import { useObservable } from "./hooks";

export interface ExportRequest {
	readonly view: TaskView | null;
}

export class ExportController extends Observable<ExportRequest | null> {
	constructor() {
		super(null);
	}

	openView(view: TaskView): void {
		this.set({ view });
	}

	openLists(): void {
		this.set({ view: null });
	}

	close(request: ExportRequest): void {
		if (this.get() === request) {
			this.set(null);
		}
	}
}

const ExportContext = createContext<ExportController>(new ExportController());

export interface ExportActions {
	readonly exportView: () => void;
	readonly exportLists: () => void;
}

export function useExportActions(): ExportActions | null {
	const controller = useContext(ExportContext);
	const { exporter, store } = useContainer();
	if (!exporter.available) {
		return null;
	}
	return {
		exportView: () => controller.openView(store.selectedView),
		exportLists: () => controller.openLists(),
	};
}

export function ExportHost({ children }: { children: ReactNode }) {
	const controller = useMemo(() => new ExportController(), []);
	const request = useObservable(controller);
	return (
		<ExportContext.Provider value={controller}>
			<View style={{ flex: 1 }}>
				{children}
				{request === null ? null : (
					<ExportDialog request={request} onClose={() => controller.close(request)} />
				)}
			</View>
		</ExportContext.Provider>
	);
}
