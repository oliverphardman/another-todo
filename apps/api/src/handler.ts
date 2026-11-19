import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { createApi, readConfig } from "./bootstrap";
import type { HttpEvent, HttpResult } from "./http/types";

const api = createApi(
	readConfig(process.env),
	DynamoDBDocumentClient.from(new DynamoDBClient({}), {
		marshallOptions: { removeUndefinedValues: true },
	}),
);

export const handler = (event: HttpEvent): Promise<HttpResult> => api.handle(event);
