import { ValidationError } from "../domain/errors";
import type { components } from "../generated/api";

export type DefaultSettingsData = components["schemas"]["DefaultSettings"];

interface Rule {
	readonly expected: string;
	accepts(value: unknown): boolean;
}

interface Shape {
	readonly [name: string]: Rule | Shape;
}

const flag: Rule = {
	expected: "true or false",
	accepts: (value) => typeof value === "boolean",
};

const oneOf = (...choices: string[]): Rule => ({
	expected: choices.join(" or "),
	accepts: (value) => choices.includes(value as string),
});

const wholeNumber = (min: number, max: number): Rule => ({
	expected: `a whole number from ${min} to ${max}`,
	accepts: (value) =>
		Number.isInteger(value) && (value as number) >= min && (value as number) <= max,
});

const SHAPE: Shape = {
	rowStyle: oneOf("cozy", "compact"),
	menuStyle: oneOf("cozy", "compact"),
	addTaskPosition: oneOf("top", "bottom"),
	microsoft: { receive: flag, send: flag, intervalMinutes: wholeNumber(1, 1440) },
	lists: { all: flag, important: flag, planned: flag, completed: flag },
	myDay: { yesterday: flag, dueToday: flag },
};

export class DefaultSettings {
	static parse(json: string | null): DefaultSettingsData {
		if (json === null) {
			return {};
		}
		let value: unknown;
		try {
			value = JSON.parse(json);
		} catch {
			throw new ValidationError("DEFAULT_SETTINGS must be a JSON object");
		}
		DefaultSettings.check(value, SHAPE, "DEFAULT_SETTINGS");
		return value as DefaultSettingsData;
	}

	private static check(value: unknown, shape: Shape, path: string): void {
		if (typeof value !== "object" || value === null || Array.isArray(value)) {
			throw new ValidationError(`${path} must be a JSON object`);
		}
		for (const [name, entry] of Object.entries(value)) {
			const at = `${path}.${name}`;
			if (!Object.hasOwn(shape, name)) {
				throw new ValidationError(`${at} is not a setting`);
			}
			const rule = shape[name]!;
			if (!DefaultSettings.isRule(rule)) {
				DefaultSettings.check(entry, rule, at);
			} else if (!rule.accepts(entry)) {
				throw new ValidationError(`${at} must be ${rule.expected}`);
			}
		}
	}

	private static isRule(entry: Rule | Shape): entry is Rule {
		return typeof entry.accepts === "function";
	}
}
