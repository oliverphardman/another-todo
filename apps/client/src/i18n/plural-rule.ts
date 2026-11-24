export class PluralRule {
	private constructor(private readonly rules: Intl.PluralRules | null) {}

	static for(locale: string): PluralRule {
		const supported = typeof Intl !== "undefined" && typeof Intl.PluralRules === "function";
		return new PluralRule(supported ? new Intl.PluralRules(locale) : null);
	}

	isSingular(count: number): boolean {
		return this.rules ? this.rules.select(count) === "one" : count === 1;
	}
}
