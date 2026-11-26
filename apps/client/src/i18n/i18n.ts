import { DueDay } from "../domain/due-day";
import type { RepeatRule } from "../domain/recurrence";
import type { MessageKey } from "./en-us";
import { CATALOGS, DEFAULT_LOCALE } from "./locales";
import { PluralRule } from "./plural-rule";

export type MessageParams = Readonly<Record<string, string | number>>;

export type LocalizedText =
	{ readonly key: MessageKey; readonly params?: MessageParams } | { readonly message: string };

type PluralBase = {
	[K in MessageKey]: K extends `${infer Base}_one` ? Base : never;
}[MessageKey];

const MINUTE_MS = 60_000;
const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;

export class I18n {
	readonly messages: Readonly<Record<MessageKey, string>>;
	private readonly plurals: PluralRule;
	private readonly shortDayFormat: Intl.DateTimeFormat;
	private readonly shortDayWithYear: Intl.DateTimeFormat;
	private readonly longDayFormat: Intl.DateTimeFormat;
	private readonly reminderFormat: Intl.DateTimeFormat;
	private readonly monthFormat: Intl.DateTimeFormat;
	private readonly weekdayFormat: Intl.DateTimeFormat;
	private readonly shortWeekdayFormat: Intl.DateTimeFormat;
	private readonly longWeekdayFormat: Intl.DateTimeFormat;

	readonly locale: string;

	constructor(requested: string = DEFAULT_LOCALE) {
		this.locale = requested in CATALOGS ? requested : DEFAULT_LOCALE;
		const locale = this.locale;
		this.messages = CATALOGS[locale]!;
		this.plurals = PluralRule.for(locale);
		const base = { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" } as const;
		this.shortDayFormat = new Intl.DateTimeFormat(locale, base);
		this.shortDayWithYear = new Intl.DateTimeFormat(locale, { ...base, year: "numeric" });
		this.reminderFormat = new Intl.DateTimeFormat(locale, {
			weekday: "short",
			month: "short",
			day: "numeric",
			hour: "numeric",
			minute: "2-digit",
		});
		this.monthFormat = new Intl.DateTimeFormat(locale, {
			month: "long",
			year: "numeric",
			timeZone: "UTC",
		});
		this.weekdayFormat = new Intl.DateTimeFormat(locale, { weekday: "narrow", timeZone: "UTC" });
		this.shortWeekdayFormat = new Intl.DateTimeFormat(locale, {
			weekday: "short",
			timeZone: "UTC",
		});
		this.longWeekdayFormat = new Intl.DateTimeFormat(locale, { weekday: "long", timeZone: "UTC" });
		this.longDayFormat = new Intl.DateTimeFormat(locale, {
			weekday: "long",
			month: "long",
			day: "numeric",
			timeZone: "UTC",
		});
	}

	get firstWeekday(): number {
		return this.locale === "en-GB" ? 1 : 0;
	}

	t = (key: MessageKey, params: MessageParams = {}): string =>
		this.messages[key].replace(/\{(\w+)\}/g, (_, name: string) =>
			String(params[name] ?? `{${name}}`),
		);

	count = (base: PluralBase, count: number, params: MessageParams = {}): string => {
		const category = this.plurals.isSingular(count) ? "one" : "other";
		return this.t(`${base}_${category}` as MessageKey, { ...params, count });
	};

	viewTitle(view: { readonly title: string; readonly titleKey: MessageKey | null }): string {
		return view.titleKey === null ? view.title : this.t(view.titleKey);
	}

	text(value: LocalizedText): string {
		return "key" in value ? this.t(value.key, value.params) : value.message;
	}

	dueLabel(day: string, today: string): string {
		const offset = DueDay.daysBetween(today, day);
		if (offset === 0) {
			return this.t("due.today");
		}
		if (offset === 1) {
			return this.t("due.tomorrow");
		}
		if (offset === -1) {
			return this.t("due.yesterday");
		}
		const sameYear = day.slice(0, 4) === today.slice(0, 4);
		return (sameYear ? this.shortDayFormat : this.shortDayWithYear).format(
			new Date(`${day}T00:00:00.000Z`),
		);
	}

	fileSize(bytes: number): string {
		if (bytes < 1024) {
			return this.t("attachment.bytes", { size: bytes });
		}
		if (bytes < 1024 * 1024) {
			return this.t("attachment.kilobytes", { size: Math.round(bytes / 1024) });
		}
		const size = new Intl.NumberFormat(this.locale, { maximumFractionDigits: 1 }).format(
			bytes / (1024 * 1024),
		);
		return this.t("attachment.megabytes", { size });
	}

	reminderLabel(iso: string): string {
		return this.reminderFormat.format(new Date(iso));
	}

	shortDay(day: string): string {
		return this.shortDayFormat.format(new Date(`${day}T00:00:00.000Z`));
	}

	longDay(day: string): string {
		return this.longDayFormat.format(new Date(`${day}T00:00:00.000Z`));
	}

	monthLabel(day: string): string {
		return this.monthFormat.format(new Date(`${day}T00:00:00.000Z`));
	}

	get weekdays(): number[] {
		return Array.from({ length: 7 }, (_, index) => (this.firstWeekday + index) % 7);
	}

	weekdayInitials(): string[] {
		return this.weekdays.map((weekday) => this.weekdayFormat.format(I18n.dateOf(weekday)));
	}

	shortWeekday(weekday: number): string {
		return this.shortWeekdayFormat.format(I18n.dateOf(weekday));
	}

	longWeekday(weekday: number): string {
		return this.longWeekdayFormat.format(I18n.dateOf(weekday));
	}

	repeatLabel(rule: RepeatRule): string {
		if (rule.frequency !== "weekly") {
			return this.t(`repeat.${rule.frequency}`);
		}
		const days = this.weekdays
			.filter((weekday) => rule.weekdays?.includes(weekday))
			.map((weekday) => this.shortWeekday(weekday));
		return this.t("repeat.weeklyOn", { days: days.join(", ") });
	}

	private static dateOf(weekday: number): Date {
		const sunday = "2026-01-04";
		return new Date(DueDay.toIso(DueDay.add(sunday, weekday)));
	}

	createdLabel(createdAt: string, now: Date): string {
		const elapsed = now.getTime() - new Date(createdAt).getTime();
		if (elapsed < MINUTE_MS) {
			return this.t("task.created", { when: this.t("created.fewMoments") });
		}
		if (elapsed < HOUR_MS) {
			return this.t("task.created", {
				when: this.count("created.minutes", Math.floor(elapsed / MINUTE_MS)),
			});
		}
		if (elapsed < DAY_MS) {
			return this.t("task.created", {
				when: this.count("created.hours", Math.floor(elapsed / HOUR_MS)),
			});
		}
		const today = DueDay.fromDate(now);
		const day = DueDay.fromDate(new Date(createdAt));
		const when =
			DueDay.daysBetween(day, today) === 1
				? this.t("created.yesterday")
				: this.dueLabel(day, today);
		return this.t("task.created", { when });
	}
}
