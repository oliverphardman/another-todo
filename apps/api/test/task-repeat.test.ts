import { describe, expect, it } from "vitest";
import { Task } from "../src/domain/task";
import { createService } from "./support/fixtures";

describe("repeating tasks", () => {
	it("stores, replaces and removes a repeat rule", async () => {
		const service = createService();
		const task = await service.create("u", { title: "A", repeat: { frequency: "daily" } });
		expect(task.toJSON().repeat).toEqual({ frequency: "daily" });
		expect(Task.restore(task.toRecord()).repeat).toEqual({ frequency: "daily" });
		const weekly = await service.update("u", task.id, {
			repeat: { frequency: "weekly", weekdays: [5, 1, 5] },
		});
		expect(weekly.repeat).toEqual({ frequency: "weekly", weekdays: [1, 5] });
		const monthly = await service.update("u", task.id, {
			repeat: { frequency: "monthly", monthDay: 31 },
		});
		expect(monthly.repeat).toEqual({ frequency: "monthly", monthDay: 31 });
		const yearly = await service.update("u", task.id, { repeat: { frequency: "yearly" } });
		expect(yearly.repeat).toEqual({ frequency: "yearly" });
		expect((await service.update("u", task.id, { repeat: null })).repeat).toBeNull();
	});

	it("restores records saved before repeating existed", () => {
		const { repeat: _repeat, ...legacy } = Task.create("u", "1", "A", new Date()).toRecord();
		expect(Task.restore(legacy).repeat).toBeNull();
	});

	it("refuses rules that make no sense", async () => {
		const service = createService();
		for (const repeat of [
			"daily",
			{},
			{ frequency: "hourly" },
			{ frequency: "weekly" },
			{ frequency: "weekly", weekdays: [] },
			{ frequency: "weekly", weekdays: [7] },
			{ frequency: "weekly", weekdays: [1.5] },
			{ frequency: "monthly", monthDay: 0 },
			{ frequency: "yearly", monthDay: "1" },
		]) {
			await expect(service.create("u", { title: "A", repeat })).rejects.toThrow(/repeat/);
		}
	});
});
