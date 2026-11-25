import type { AboutBridge, AboutDetails } from "./about";

export interface DesktopAboutModule {
	setAbout?(details: AboutDetails): void;
}

export class DesktopAboutBridge implements AboutBridge {
	constructor(private readonly module: DesktopAboutModule | null | undefined) {}

	describe(details: AboutDetails): void {
		this.module?.setAbout?.(details);
	}
}
