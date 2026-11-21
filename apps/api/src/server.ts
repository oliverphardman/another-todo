import { createApplication, readConfig } from "./bootstrap";
import { Settings } from "./composition/env";
import {
	PlatformFactory,
	ProviderDefaultsFor,
	ProviderRegistries,
} from "./composition/provider-registry";
import { WebHost } from "./http/web-host";
import { publicUrlOf, readPort } from "./listen-address";
import { LOCAL_DEFAULTS, localProviders } from "./infrastructure/local/local-providers";
import { sharedProviders } from "./infrastructure/shared/enforced-identity";

const settings = new Settings(process.env);
const port = readPort(process.env.PORT);
const config = readConfig(process.env, publicUrlOf(process.env));
const webDirectory = settings.optional("WEB_DIR");

const platform = new PlatformFactory(
	ProviderRegistries.merge(localProviders, sharedProviders),
	ProviderDefaultsFor.withEnforcedUser(LOCAL_DEFAULTS),
).create(process.env, config.publicUrl);

const web =
	webDirectory === null
		? null
		: new WebHost(webDirectory, {
				serverUrl: settings.optional("ENFORCED_SERVER_URL") ?? "",
				enforced: true,
			}).router();

export const server = createApplication(config, platform, web).listen(port, "0.0.0.0");
platform.realtime.attach(server);

process.once("SIGTERM", () => {
	server.close();
});
