import {
	ApiGatewayManagementApiClient,
	GoneException,
	PostToConnectionCommand,
} from "@aws-sdk/client-apigatewaymanagementapi";
import type { ConnectionPusher } from "../../application/change-notifier";

export class ApiGatewayPusher implements ConnectionPusher {
	constructor(private readonly client: Pick<ApiGatewayManagementApiClient, "send">) {}

	static forEndpoint(endpoint: string): ApiGatewayPusher {
		return new ApiGatewayPusher(new ApiGatewayManagementApiClient({ endpoint }));
	}

	async push(connectionId: string, message: string): Promise<boolean> {
		try {
			await this.client.send(
				new PostToConnectionCommand({ ConnectionId: connectionId, Data: Buffer.from(message) }),
			);
			return true;
		} catch (error) {
			if (error instanceof GoneException) {
				return false;
			}
			throw error;
		}
	}
}
