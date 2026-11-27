export class RowSlots {
	private scope: string | null = null;
	private assigned = new Map<string, string>();
	private issued = 0;

	assign(
		scope: string,
		items: readonly { readonly key: string; readonly kind: string }[],
	): ReadonlyMap<string, string> {
		const entered = this.scope !== scope;
		const counts = new Map<string, number>();
		this.assigned = new Map(
			items.map(({ key, kind }) => {
				const index = counts.get(kind) ?? 0;
				counts.set(kind, index + 1);
				const slot = entered
					? `${kind}-${index}`
					: (this.assigned.get(key) ?? `${kind}-new-${this.issued++}`);
				return [key, slot];
			}),
		);
		this.scope = scope;
		return this.assigned;
	}
}
