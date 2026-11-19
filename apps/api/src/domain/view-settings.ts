export const SORT_KEYS = ["importance", "alphabetical", "due", "created", "myDay"] as const;

export type SortKey = (typeof SORT_KEYS)[number];

export type ThemeSetting =
	| { readonly type: "color"; readonly color: string }
	| { readonly type: "photo"; readonly photoId: string };

export interface ViewSettingsRecord {
	readonly ownerId: string;
	readonly id: string;
	readonly sort: SortKey | null;
	readonly sortDescending?: boolean;
	readonly hideCompleted: boolean;
	readonly theme: ThemeSetting | null;
	readonly updatedAt: string;
}

export class ViewSettings {
	private constructor(
		readonly ownerId: string,
		readonly id: string,
		readonly sort: SortKey | null,
		readonly sortDescending: boolean,
		readonly hideCompleted: boolean,
		readonly theme: ThemeSetting | null,
		readonly updatedAt: Date,
	) {}

	static create(
		ownerId: string,
		id: string,
		values: {
			readonly sort: SortKey | null;
			readonly sortDescending: boolean;
			readonly hideCompleted: boolean;
			readonly theme: ThemeSetting | null;
		},
		updatedAt: Date,
	): ViewSettings {
		return new ViewSettings(
			ownerId,
			id,
			values.sort,
			values.sortDescending,
			values.hideCompleted,
			values.theme,
			updatedAt,
		);
	}

	static restore(record: ViewSettingsRecord): ViewSettings {
		return new ViewSettings(
			record.ownerId,
			record.id,
			record.sort,
			record.sortDescending ?? false,
			record.hideCompleted,
			record.theme,
			new Date(record.updatedAt),
		);
	}

	withoutTheme(updatedAt: Date): ViewSettings {
		return new ViewSettings(
			this.ownerId,
			this.id,
			this.sort,
			this.sortDescending,
			this.hideCompleted,
			null,
			updatedAt,
		);
	}

	toRecord(): ViewSettingsRecord {
		return {
			ownerId: this.ownerId,
			id: this.id,
			sort: this.sort,
			sortDescending: this.sortDescending,
			hideCompleted: this.hideCompleted,
			theme: this.theme,
			updatedAt: this.updatedAt.toISOString(),
		};
	}

	toJSON(): Omit<ViewSettingsRecord, "ownerId"> {
		const { ownerId: _ownerId, ...view } = this.toRecord();
		return view;
	}
}
