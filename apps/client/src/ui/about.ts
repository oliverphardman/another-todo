import { aboutBridge } from "./about-bridge";

export interface AboutDetails {
	readonly serverLabel: string;
	readonly serverUrl: string | null;
	readonly sourceLabel: string;
	readonly sourceUrl: string;
	readonly license: string;
}

export interface AboutBridge {
	describe(details: AboutDetails): void;
}

export class About {
	static bridge: AboutBridge = aboutBridge;
}
