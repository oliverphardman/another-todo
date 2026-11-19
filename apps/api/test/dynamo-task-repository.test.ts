import { describe, expect, it } from "vitest";
import { Task } from "../src/domain/task";
import { TodoList } from "../src/domain/todo-list";
import { DynamoTodoListRepository } from "../src/infrastructure/dynamo-todo-list-repository";
import { DynamoTaskRepository } from "../src/infrastructure/dynamo-task-repository";
import { EmptyQueryClient, FakeDocumentClient } from "./support/fake-document-client";

const now = new Date("2026-01-01T00:00:00Z");

describe("DynamoTaskRepository", () => {
	it("saves, finds and deletes", async () => {
		const fake = new FakeDocumentClient();
		const repo = new DynamoTaskRepository(fake.asClient(), "tasks");
		const task = Task.create("u", "1", "A", now).setDueDate(now);
		await repo.save(task);
		expect((await repo.findById("u", "1"))?.toRecord()).toEqual(task.toRecord());
		await repo.delete("u", "1");
		expect(await repo.findById("u", "1")).toBeNull();
	});

	it("lists across pages", async () => {
		const fake = new FakeDocumentClient(2);
		const repo = new DynamoTaskRepository(fake.asClient(), "tasks");
		for (const id of ["1", "2", "3"]) {
			await repo.save(Task.create("u", id, `T${id}`, now));
		}
		await repo.save(Task.create("other", "9", "X", now));
		expect((await repo.list("u")).map((task) => task.id)).toEqual(["1", "2", "3"]);
	});

	it("treats a missing Items list as empty", async () => {
		const repo = new DynamoTaskRepository(new EmptyQueryClient().asClient(), "tasks");
		expect(await repo.list("u")).toEqual([]);
	});
});

describe("DynamoTodoListRepository", () => {
	it("saves, finds, lists and deletes lists", async () => {
		const repo = new DynamoTodoListRepository(new FakeDocumentClient(1).asClient(), "lists");
		const list = TodoList.create("u", "1", "Work", now);
		await repo.save(list);
		await repo.save(TodoList.create("u", "2", "Home", now));
		expect((await repo.findById("u", "1"))?.toRecord()).toEqual(list.toRecord());
		expect(await repo.list("u")).toHaveLength(2);
		await repo.delete("u", "1");
		expect(await repo.findById("u", "1")).toBeNull();
	});
});

describe("consistent reads", () => {
	it("asks DynamoDB for strongly consistent reads so a sync right after a write sees it", async () => {
		const inputs: { ConsistentRead?: boolean }[] = [];
		const client = {
			send: async (command: { input: { ConsistentRead?: boolean } }) => {
				inputs.push(command.input);
				return { Items: [] };
			},
		};
		const repo = new DynamoTaskRepository(client as never, "tasks");
		await repo.findById("u", "1");
		await repo.list("u");
		expect(inputs).toHaveLength(2);
		expect(inputs.every((input) => input.ConsistentRead === true)).toBe(true);
	});
});
