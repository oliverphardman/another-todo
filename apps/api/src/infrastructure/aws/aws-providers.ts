import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { S3Client } from "@aws-sdk/client-s3";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { Settings } from "../../composition/env";
import { MediaAddress } from "../../composition/media-address";
import type { Env, Identity, Media, Realtime } from "../../composition/platform";
import type { ProviderRegistry } from "../../composition/provider-registry";
import { BearerAuthenticator } from "../../http/authenticator";
import { ApiGatewayChangeChannel } from "./api-gateway-change-channel";
import { ApiGatewayPusher } from "./api-gateway-pusher";
import { CognitoTokenVerifier } from "./cognito-token-verifier";
import { CognitoUserDirectory } from "./cognito-user-directory";
import { DynamoConnectionRepository } from "./dynamo-connection-repository";
import { DynamoDataStore } from "./dynamo-data-store";
import { S3MediaStorage } from "./s3-media-storage";

export class AwsClients {
	static documents(): DynamoDBDocumentClient {
		return DynamoDBDocumentClient.from(new DynamoDBClient({}), {
			marshallOptions: { removeUndefinedValues: true },
		});
	}

	static connections(env: Env): DynamoConnectionRepository {
		const { CONNECTIONS_TABLE_NAME } = new Settings(env).require("CONNECTIONS_TABLE_NAME");
		return new DynamoConnectionRepository(AwsClients.documents(), CONNECTIONS_TABLE_NAME);
	}
}

function cognito(env: Env): Identity {
	const settings = new Settings(env);
	const { COGNITO_USER_POOL_ID, COGNITO_CLIENT_ID } = settings.require(
		"COGNITO_USER_POOL_ID",
		"COGNITO_CLIENT_ID",
	);
	const authUrl = settings.optional("COGNITO_AUTH_URL");
	const verifier = new CognitoTokenVerifier(COGNITO_USER_POOL_ID, COGNITO_CLIENT_ID);
	return {
		mode: "external",
		providers: [],
		authenticator: new BearerAuthenticator(verifier),
		directory: CognitoUserDirectory.forPool(COGNITO_USER_POOL_ID),
		issuer: verifier.issuer,
		signIn: authUrl === null ? null : { url: authUrl, clientId: COGNITO_CLIENT_ID },
		router: null,
	};
}

function dynamodb(env: Env): DynamoDataStore {
	const names = new Settings(env).require(
		"TABLE_NAME",
		"LISTS_TABLE_NAME",
		"SETTINGS_TABLE_NAME",
		"PHOTOS_TABLE_NAME",
		"ATTACHMENTS_TABLE_NAME",
		"GROUPS_TABLE_NAME",
		"SHARES_TABLE_NAME",
	);
	return new DynamoDataStore(AwsClients.documents(), {
		tasks: names.TABLE_NAME,
		lists: names.LISTS_TABLE_NAME,
		settings: names.SETTINGS_TABLE_NAME,
		photos: names.PHOTOS_TABLE_NAME,
		attachments: names.ATTACHMENTS_TABLE_NAME,
		groups: names.GROUPS_TABLE_NAME,
		shares: names.SHARES_TABLE_NAME,
	});
}

function s3(env: Env): Media {
	const { PHOTOS_BUCKET } = new Settings(env).require("PHOTOS_BUCKET");
	const address = MediaAddress.from(env);
	if (address !== null && address.pathname !== "/") {
		throw new Error("MEDIA_PUBLIC_URL cannot have a path when media is stored in S3");
	}
	const storage = new S3MediaStorage(new S3Client({}), PHOTOS_BUCKET, address?.origin ?? null);
	return { storage, router: null };
}

function apigateway(env: Env): Realtime {
	const { WEBSOCKET_MANAGEMENT_URL } = new Settings(env).require("WEBSOCKET_MANAGEMENT_URL");
	return {
		channel: new ApiGatewayChangeChannel(
			AwsClients.connections(env),
			ApiGatewayPusher.forEndpoint(WEBSOCKET_MANAGEMENT_URL),
		),
		endpoint: WEBSOCKET_MANAGEMENT_URL.replace(/^https:/, "wss:"),
		attach: () => undefined,
	};
}

export const awsProviders: ProviderRegistry = {
	data: { dynamodb },
	media: { s3 },
	identity: { cognito },
	realtime: { apigateway },
};

export const AWS_DEFAULTS = {
	data: "dynamodb",
	media: "s3",
	identity: "cognito",
	realtime: "apigateway",
} as const;
