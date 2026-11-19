import { execFileSync } from "node:child_process";
import { DynamoDBClient, ListTablesCommand } from "@aws-sdk/client-dynamodb";

const IMAGE = "amazon/dynamodb-local:latest";

async function waitUntilReady(endpoint: string): Promise<void> {
	const client = new DynamoDBClient({
		endpoint,
		region: "eu-west-2",
		credentials: { accessKeyId: "local", secretAccessKey: "local" },
	});
	for (let attempt = 0; attempt < 60; attempt += 1) {
		try {
			await client.send(new ListTablesCommand({}));
			return;
		} catch {
			await new Promise((resolve) => setTimeout(resolve, 500));
		}
	}
	throw new Error("DynamoDB Local did not become ready");
}

export async function setup(): Promise<() => void> {
	const container = execFileSync("docker", ["run", "-d", "--rm", "-p", "127.0.0.1::8000", IMAGE])
		.toString()
		.trim();
	const mapping = execFileSync("docker", ["port", container, "8000/tcp"]).toString().trim();
	const endpoint = `http://${mapping.split("\n")[0]}`;
	process.env.DYNAMODB_ENDPOINT = endpoint;
	await waitUntilReady(endpoint);
	return () => {
		execFileSync("docker", ["rm", "-f", container]);
	};
}
