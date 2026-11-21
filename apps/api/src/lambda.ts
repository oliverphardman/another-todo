import { createApplication, readConfig } from "./bootstrap";
import { PlatformFactory, ProviderRegistries } from "./composition/provider-registry";
import { AWS_DEFAULTS, awsProviders } from "./infrastructure/aws/aws-providers";
import { sharedProviders } from "./infrastructure/shared/enforced-identity";
import { parseListenAddress } from "./listen-address";

const { host, port } = parseListenAddress(process.env.AWS_LAMBDA_HTTP_ENDPOINT);
const config = readConfig(process.env);

const platform = new PlatformFactory(
	ProviderRegistries.merge(awsProviders, sharedProviders),
	AWS_DEFAULTS,
).create(process.env, config.publicUrl);

export const server = createApplication(config, platform).listen(port, host);

process.once("SIGTERM", () => {
	server.close();
});
