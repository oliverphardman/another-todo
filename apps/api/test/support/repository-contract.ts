import { describe, expect, it } from "vitest";

export interface Owned {
	readonly ownerId: string;
	readonly id: string;
	toRecord(): unknown;
}

export interface RepositoryUnderTest<E extends Owned> {
	save(entity: E): Promise<void>;
	findById(ownerId: string, id: string): Promise<E | null>;
	list(ownerId: string): Promise<E[]>;
	delete(ownerId: string, id: string): Promise<void>;
}

export function describeRepositoryContract<E extends Owned>(
	name: string,
	create: () => RepositoryUnderTest<E>,
	make: (ownerId: string, id: string) => E,
): void {
	describe(`${name} repository contract`, () => {
		it("returns nothing for an unknown id or owner", async () => {
			const repository = create();
			expect(await repository.findById("u", "missing")).toBeNull();
			expect(await repository.list("u")).toEqual([]);
		});

		it("stores and restores an entity without losing data", async () => {
			const repository = create();
			const entity = make("u", "1");
			await repository.save(entity);
			expect((await repository.findById("u", entity.id))?.toRecord()).toEqual(entity.toRecord());
		});

		it("replaces an entity saved again under the same key", async () => {
			const repository = create();
			await repository.save(make("u", "1"));
			await repository.save(make("u", "1"));
			expect(await repository.list("u")).toHaveLength(1);
		});

		it("keeps every owner's data separate", async () => {
			const repository = create();
			const first = make("a", "1");
			const second = make("a", "2");
			const other = make("b", "1");
			for (const entity of [first, second, other]) {
				await repository.save(entity);
			}
			expect(ids(await repository.list("a"))).toEqual(ids([first, second]));
			expect(ids(await repository.list("b"))).toEqual(ids([other]));
		});

		it("deletes only the entity named and tolerates deleting twice", async () => {
			const repository = create();
			const doomed = make("a", "1");
			const kept = make("a", "2");
			await repository.save(doomed);
			await repository.save(kept);
			await repository.delete("a", doomed.id);
			await repository.delete("a", doomed.id);
			expect(await repository.findById("a", doomed.id)).toBeNull();
			expect(ids(await repository.list("a"))).toEqual(ids([kept]));
		});

		it("lists more entities than one page holds", async () => {
			const repository = create();
			for (const key of ["1", "2", "3", "4", "5"]) {
				await repository.save(make("u", key));
			}
			expect(await repository.list("u")).toHaveLength(5);
		});
	});
}

function ids(entities: readonly Owned[]): string[] {
	return entities.map((entity) => entity.id).sort();
}
