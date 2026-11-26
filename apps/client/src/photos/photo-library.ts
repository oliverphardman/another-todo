import { ApiError } from "../api/errors";
import type { LocalizedText } from "../i18n/i18n";
import type { AuthStatus } from "../auth/authentication-service";
import { Observable } from "../state/observable";
import { PhotoRules, type PhotoData } from "./photo";
import type { PhotoGateway, PhotoPicker } from "./photo-gateway";

export interface PhotoLibraryState {
	readonly photos: readonly PhotoData[];
	readonly busy: "idle" | "loading" | "uploading";
	readonly error: PhotoError | null;
}

export type PhotoError = LocalizedText;

const REFRESH_MS = 30 * 60_000;

export class PhotoLibrary extends Observable<PhotoLibraryState> {
	private interval: ReturnType<typeof setInterval> | null = null;
	private unsubscribe: (() => void) | null = null;

	constructor(
		private readonly gateway: PhotoGateway,
		private readonly picker: PhotoPicker,
		private readonly auth: Observable<AuthStatus>,
		private readonly maxBytes?: number,
	) {
		super({ photos: [], busy: "idle", error: null });
	}

	start(): void {
		this.stop();
		this.unsubscribe = this.auth.subscribe(() => {
			if (this.auth.get() === "signedIn") {
				void this.refresh(true);
			} else if (this.auth.get() === "signedOut") {
				this.set({ photos: [], busy: "idle", error: null });
			}
		});
		this.interval = setInterval(() => {
			if (this.auth.get() === "signedIn") {
				void this.refresh(true);
			}
		}, REFRESH_MS);
		if (this.auth.get() === "signedIn") {
			void this.refresh(true);
		}
	}

	stop(): void {
		this.unsubscribe?.();
		this.unsubscribe = null;
		if (this.interval !== null) {
			clearInterval(this.interval);
			this.interval = null;
		}
	}

	urlFor(photoId: string): string | null {
		return this.get().photos.find((photo) => photo.id === photoId)?.url ?? null;
	}

	async refresh(quiet = false): Promise<void> {
		if (!quiet && this.get().busy !== "uploading") {
			this.set({ ...this.get(), busy: "loading", error: null });
		}
		try {
			const photos = await this.gateway.list();
			this.set({ ...this.get(), photos, busy: this.settled(), error: null });
		} catch (error) {
			this.set({
				...this.get(),
				busy: this.settled(),
				error: quiet ? this.get().error : PhotoLibrary.describe(error),
			});
		}
	}

	async upload(): Promise<PhotoData | null> {
		this.set({ ...this.get(), busy: "uploading", error: null });
		try {
			const picked = await this.picker.pick();
			if (picked === null) {
				this.set({ ...this.get(), busy: "idle" });
				return null;
			}
			const problem = PhotoRules.problemWith(picked, this.maxBytes);
			if (problem !== null) {
				this.set({ ...this.get(), busy: "idle", error: problem });
				return null;
			}
			const photo = await this.gateway.create(picked);
			this.set({ photos: [...this.get().photos, photo], busy: "idle", error: null });
			return photo;
		} catch (error) {
			this.set({ ...this.get(), busy: "idle", error: PhotoLibrary.describe(error) });
			return null;
		}
	}

	async remove(photoId: string): Promise<boolean> {
		this.set({ ...this.get(), error: null });
		try {
			await this.gateway.remove(photoId);
			this.set({
				...this.get(),
				photos: this.get().photos.filter((photo) => photo.id !== photoId),
			});
			return true;
		} catch (error) {
			this.set({ ...this.get(), error: PhotoLibrary.describe(error) });
			return false;
		}
	}

	private settled(): "idle" | "uploading" {
		return this.get().busy === "uploading" ? "uploading" : "idle";
	}

	private static describe(error: unknown): PhotoError {
		return error instanceof ApiError
			? { message: error.message }
			: { key: "photo.errorUnavailable" };
	}
}
