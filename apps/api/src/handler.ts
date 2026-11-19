import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { createHandler, readConfig } from "./bootstrap";

export const handler = createHandler(
	readConfig(process.env),
	DynamoDBDocumentClient.from(new DynamoDBClient({}), {
		marshallOptions: { removeUndefinedValues: true },
	}),
);
