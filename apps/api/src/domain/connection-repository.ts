import type { Connection } from "./connection";

export interface ConnectionRepository {
	save(connection: Connection): Promise<void>;
	list(ownerId: string): Promise<Connection[]>;
	delete(ownerId: string, id: string): Promise<void>;
}
