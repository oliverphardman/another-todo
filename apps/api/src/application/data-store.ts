import type { GroupRepository } from "../domain/group-repository";
import type { PhotoRepository } from "../domain/photo-repository";
import type { ShareRepository } from "../domain/share-repository";
import type { TaskRepository } from "../domain/task-repository";
import type { TodoListRepository } from "../domain/todo-list-repository";
import type { ViewSettingsRepository } from "../domain/view-settings-repository";

export interface DataStore {
	readonly tasks: TaskRepository;
	readonly lists: TodoListRepository;
	readonly groups: GroupRepository;
	readonly shares: ShareRepository;
	readonly photos: PhotoRepository;
	readonly settings: ViewSettingsRepository;
}
