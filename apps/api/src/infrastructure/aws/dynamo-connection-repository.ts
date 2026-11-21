import { Connection, type ConnectionRecord } from "../../domain/connection";
import type { ConnectionRepository } from "../../domain/connection-repository";
import { DynamoRepository } from "./dynamo-repository";

export class DynamoConnectionRepository
	extends DynamoRepository<Connection, ConnectionRecord>
	implements ConnectionRepository
{
	protected toRecord(connection: Connection): ConnectionRecord {
		return connection.toRecord();
	}

	protected restore(record: ConnectionRecord): Connection {
		return Connection.restore(record);
	}
}
