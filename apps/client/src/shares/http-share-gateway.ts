import type { AuthorizedHttp } from "../api/authorized-http";
import type { components } from "../generated/api";
import type { ShareGateway, ShareMember } from "./share-gateway";

export class HttpShareGateway implements ShareGateway {
	constructor(private readonly http: AuthorizedHttp) {}

	async list(listId: string): Promise<ShareMember[]> {
		const body = await this.http.request<components["schemas"]["ShareCollection"]>(
			"GET",
			`/lists/${encodeURIComponent(listId)}/shares`,
		);
		return body.shares.map((share) => ({ ...share }));
	}

	async add(listId: string, email: string): Promise<ShareMember> {
		const share = await this.http.request<components["schemas"]["Share"]>(
			"POST",
			`/lists/${encodeURIComponent(listId)}/shares`,
			{ email },
		);
		return { ...share };
	}

	async remove(listId: string, memberId: string): Promise<void> {
		await this.http.request(
			"DELETE",
			`/lists/${encodeURIComponent(listId)}/shares/${encodeURIComponent(memberId)}`,
		);
	}
}
