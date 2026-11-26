import { JwtClaims } from "./jwt-claims";

export interface Profile {
	readonly name: string | null;
	readonly email: string | null;
}

export class Profiles {
	static of(name: unknown, email: unknown): Profile | undefined {
		const profile = { name: Profiles.text(name), email: Profiles.text(email) };
		return profile.name === null && profile.email === null ? undefined : profile;
	}

	static fromIdToken(idToken: string | null | undefined): Profile | undefined {
		const claims = JwtClaims.read(idToken ?? "");
		const fullName = [claims.given_name, claims.family_name]
			.filter((part) => Profiles.text(part) !== null)
			.join(" ");
		return Profiles.of(Profiles.text(claims.name) ?? fullName, claims.email);
	}

	static initials(profile: Profile): string {
		const words = (profile.name ?? profile.email ?? "").split(/\s+/).filter(Boolean);
		const letters = words.length > 1 ? [words[0]!, words[words.length - 1]!] : words;
		return letters.map((word) => Array.from(word)[0]!.toUpperCase()).join("");
	}

	private static text(value: unknown): string | null {
		return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
	}
}
