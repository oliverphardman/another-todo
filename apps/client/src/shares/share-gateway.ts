export interface ShareMember {
	readonly id: string;
	readonly email: string;
	readonly createdAt: string;
}

export interface ShareGateway {
	list(listId: string): Promise<ShareMember[]>;
	add(listId: string, email: string): Promise<ShareMember>;
	remove(listId: string, memberId: string): Promise<void>;
}
