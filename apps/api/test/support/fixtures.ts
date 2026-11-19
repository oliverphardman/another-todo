import { PhotoService } from "../../src/application/photo-service";
import { ViewSettingsService } from "../../src/application/view-settings-service";
import { InMemoryPhotoRepository } from "../../src/domain/in-memory-photo-repository";
import { InMemoryViewSettingsRepository } from "../../src/domain/in-memory-view-settings-repository";
import { FakePhotoStorage } from "./fake-photo-storage";
import { ListService } from "../../src/application/list-service";
import type { Clock, IdGenerator } from "../../src/application/ports";
import { TaskService } from "../../src/application/task-service";
import { InMemoryTaskRepository } from "../../src/domain/in-memory-task-repository";
import { GroupService } from "../../src/application/group-service";
import { InMemoryGroupRepository } from "../../src/domain/in-memory-group-repository";
import { InMemoryTodoListRepository } from "../../src/domain/in-memory-todo-list-repository";

export class FixedClock implements Clock {
	constructor(private current = new Date("2026-01-01T00:00:00Z")) {}

	now(): Date {
		return this.current;
	}

	advance(ms: number): void {
		this.current = new Date(this.current.getTime() + ms);
	}
}

export class SequenceIds implements IdGenerator {
	private count = 0;

	next(): string {
		this.count += 1;
		return `id-${this.count}`;
	}
}

export interface TestServices {
	readonly tasks: TaskService;
	readonly lists: ListService;
	readonly settings: ViewSettingsService;
	readonly photos: PhotoService;
	readonly groups: GroupService;
	readonly storage: FakePhotoStorage;
	readonly settingsRepository: InMemoryViewSettingsRepository;
}

export function createServices(clock = new FixedClock()): TestServices {
	const tasks = new InMemoryTaskRepository();
	const lists = new InMemoryTodoListRepository();
	const settings = new InMemoryViewSettingsRepository();
	const photos = new InMemoryPhotoRepository();
	const groupRepository = new InMemoryGroupRepository();
	const storage = new FakePhotoStorage();
	const ids = new SequenceIds();
	return {
		tasks: new TaskService(tasks, lists, ids, clock),
		lists: new ListService(lists, tasks, settings, groupRepository, ids, clock),
		groups: new GroupService(groupRepository, lists, ids, clock),
		settings: new ViewSettingsService(settings, photos, clock),
		photos: new PhotoService(photos, settings, storage, ids, clock),
		storage,
		settingsRepository: settings,
	};
}

export function createService(clock = new FixedClock()): TaskService {
	return createServices(clock).tasks;
}
