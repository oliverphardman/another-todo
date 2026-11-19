import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { createApplication, readConfig } from "./bootstrap";
import { parseListenAddress } from "./listen-address";

const { host, port } = parseListenAddress(process.env.AWS_LAMBDA_HTTP_ENDPOINT);

const app = createApplication(
	readConfig(process.env),
	DynamoDBDocumentClient.from(new DynamoDBClient({}), {
		marshallOptions: { removeUndefinedValues: true },
	}),
);

export const server = app.listen(port, host);

process.once("SIGTERM", () => {
	server.close();
});
