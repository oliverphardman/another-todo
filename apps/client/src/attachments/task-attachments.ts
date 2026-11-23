import { ApiError } from "../api/errors";
import type { LocalizedText } from "../i18n/i18n";
import { Observable } from "../state/observable";
import { AttachmentRules, type AttachmentData } from "./attachment";
import type { AttachmentGateway, FilePicker } from "./attachment-gateway";

export interface TaskAttachmentsState {
	readonly taskId: string | null;
	readonly items: readonly AttachmentData[];
	readonly busy: "idle" | "loading" | "uploading";
	readonly error: LocalizedText | null;
}

const EMPTY: TaskAttachmentsState = { taskId: null, items: [], busy: "idle", error: null };

export class TaskAttachments extends Observable<TaskAttachmentsState> {
	constructor(
		private readonly gateway: AttachmentGateway,
		private readonly picker: FilePicker,
	) {
		super(EMPTY);
	}

	async show(taskId: string | null): Promise<void> {
		if (taskId === null) {
			this.set(EMPTY);
			return;
		}
		this.set({ taskId, items: [], busy: "loading", error: null });
		try {
			const items = await this.gateway.list(taskId);
			if (this.get().taskId === taskId) {
				const added = this.get().items.filter(
					(item) => !items.some((other) => other.id === item.id),
				);
				this.set({ taskId, items: [...items, ...added], busy: this.settled(), error: null });
			}
		} catch (error) {
			if (this.get().taskId === taskId) {
				this.set({
					taskId,
					items: [],
					busy: this.settled(),
					error: TaskAttachments.describe(error),
				});
			}
		}
	}

	async add(): Promise<void> {
		const taskId = this.get().taskId;
		if (taskId === null) {
			return;
		}
		this.set({ ...this.get(), busy: "uploading", error: null });
		try {
			const picked = await this.picker.pick();
			const problem = picked === null ? null : AttachmentRules.problemWith(picked);
			if (picked === null || problem !== null) {
				this.settle(taskId, this.get().items, problem === null ? null : { key: problem });
				return;
			}
			const created = await this.gateway.create(taskId, picked);
			this.settle(taskId, [...this.get().items, created], null);
		} catch (error) {
			this.settle(taskId, this.get().items, TaskAttachments.describe(error));
		}
	}

	async remove(id: string): Promise<void> {
		const taskId = this.get().taskId;
		if (taskId === null) {
			return;
		}
		this.set({ ...this.get(), error: null });
		try {
			await this.gateway.remove(taskId, id);
			this.settle(
				taskId,
				this.get().items.filter((item) => item.id !== id),
				null,
			);
		} catch (error) {
			this.settle(taskId, this.get().items, TaskAttachments.describe(error));
		}
	}

	private settled(): "idle" | "uploading" {
		return this.get().busy === "uploading" ? "uploading" : "idle";
	}

	private settle(taskId: string, items: readonly AttachmentData[], error: LocalizedText | null) {
		if (this.get().taskId === taskId) {
			this.set({ taskId, items, busy: "idle", error });
		}
	}

	private static describe(error: unknown): LocalizedText {
		return error instanceof ApiError
			? { message: error.message }
			: { key: "attachment.errorUnavailable" };
	}
}
