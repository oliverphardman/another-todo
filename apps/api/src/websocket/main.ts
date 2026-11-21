import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { SystemClock } from "../application/ports";
import { CognitoTokenVerifier } from "../infrastructure/aws/cognito-token-verifier";
import { DynamoConnectionRepository } from "../infrastructure/aws/dynamo-connection-repository";
import { WebSocketHandler, type WebSocketEvent } from "./websocket-handler";

export class WebSocketEntry {
	static create(env: Record<string, string | undefined>): WebSocketHandler {
		const { COGNITO_USER_POOL_ID: userPoolId, COGNITO_CLIENT_ID: clientId } = env;
		const table = env.CONNECTIONS_TABLE_NAME;
		if (!userPoolId || !clientId || !table) {
			throw new Error(
				"COGNITO_USER_POOL_ID, COGNITO_CLIENT_ID and CONNECTIONS_TABLE_NAME must be set",
			);
		}
		return new WebSocketHandler(
			new CognitoTokenVerifier(userPoolId, clientId),
			new DynamoConnectionRepository(DynamoDBDocumentClient.from(new DynamoDBClient({})), table),
			new SystemClock(),
		);
	}
}

let handler: WebSocketHandler | undefined;

export const handle = (event: WebSocketEvent) => {
	handler ??= WebSocketEntry.create(process.env);
	return handler.handle(event);
};
