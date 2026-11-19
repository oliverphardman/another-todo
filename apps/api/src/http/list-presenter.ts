import type { TodoList } from "../domain/todo-list";

export class ListPresenter {
	static present(list: TodoList, userId: string, sharedKeys: ReadonlySet<string>) {
		return {
			...list.toJSON(),
			owned: list.ownerId === userId,
			shared: sharedKeys.has(`${list.ownerId}#${list.id}`),
		};
	}
}
