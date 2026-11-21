import { SystemClock } from "../application/ports";
import {
	PlatformFactory,
	ProviderDefaultsFor,
	ProviderRegistries,
} from "../composition/provider-registry";
import { AWS_DEFAULTS, AwsClients, awsProviders } from "../infrastructure/aws/aws-providers";
import { sharedProviders } from "../infrastructure/shared/enforced-identity";
import { WebSocketHandler, type WebSocketEvent } from "./websocket-handler";

export class WebSocketEntry {
	static create(env: Record<string, string | undefined>): WebSocketHandler {
		const identity = new PlatformFactory(
			ProviderRegistries.merge(awsProviders, sharedProviders),
			ProviderDefaultsFor.withEnforcedUser(AWS_DEFAULTS),
		).identity(env);
		return new WebSocketHandler(
			identity.authenticator,
			AwsClients.connections(env),
			new SystemClock(),
		);
	}
}

let handler: WebSocketHandler | undefined;

export const handle = (event: WebSocketEvent) => {
	handler ??= WebSocketEntry.create(process.env);
	return handler.handle(event);
};
