import {
	CognitoIdentityProviderClient,
	ListUsersCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import type { DirectoryUser, UserDirectory } from "../application/user-directory";

export class CognitoUserDirectory implements UserDirectory {
	constructor(
		private readonly client: Pick<CognitoIdentityProviderClient, "send">,
		private readonly userPoolId: string,
	) {}

	static forPool(userPoolId: string): CognitoUserDirectory {
		return new CognitoUserDirectory(
			new CognitoIdentityProviderClient({ region: userPoolId.split("_")[0] }),
			userPoolId,
		);
	}

	async findByEmail(email: string): Promise<DirectoryUser | null> {
		const escaped = email.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
		const result = await this.client.send(
			new ListUsersCommand({
				UserPoolId: this.userPoolId,
				Filter: `email = "${escaped}"`,
				Limit: 1,
			}),
		);
		const attributes = result.Users?.[0]?.Attributes;
		const sub = attributes?.find((attribute) => attribute.Name === "sub")?.Value;
		return sub === undefined ? null : { sub, email };
	}
}
