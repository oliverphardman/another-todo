import { Task, type TaskRecord } from "../domain/task";
import type { TaskRepository } from "../domain/task-repository";
import { DynamoRepository } from "./dynamo-repository";

export class DynamoTaskRepository
	extends DynamoRepository<Task, TaskRecord>
	implements TaskRepository
{
	protected toRecord(task: Task): TaskRecord {
		return task.toRecord();
	}

	protected restore(record: TaskRecord): Task {
		return Task.restore(record);
	}
}
