export class DemoHost {
	static readonly HOSTNAME = "itsanothertodo.app";
	static readonly SOURCE_URL = "https://github.com/oliverphardman/another-todo";

	static isActive(location: { hostname?: string } | undefined = globalThis.location): boolean {
		return location?.hostname === DemoHost.HOSTNAME;
	}
}
