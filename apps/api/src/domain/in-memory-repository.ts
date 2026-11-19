interface Owned {
	readonly ownerId: string;
	readonly id: string;
}

export class InMemoryRepository<T extends Owned> {
	private readonly items = new Map<string, T>();

	private static key(ownerId: string, id: string): string {
		return `${ownerId}#${id}`;
	}

	async save(item: T): Promise<void> {
		this.items.set(InMemoryRepository.key(item.ownerId, item.id), item);
	}

	async findById(ownerId: string, id: string): Promise<T | null> {
		return this.items.get(InMemoryRepository.key(ownerId, id)) ?? null;
	}

	async list(ownerId: string): Promise<T[]> {
		return [...this.items.values()].filter((item) => item.ownerId === ownerId);
	}

	async delete(ownerId: string, id: string): Promise<void> {
		this.items.delete(InMemoryRepository.key(ownerId, id));
	}
}
