import { Group, type GroupRecord } from "../domain/group";
import type { GroupRepository } from "../domain/group-repository";
import { DynamoRepository } from "./dynamo-repository";

export class DynamoGroupRepository
	extends DynamoRepository<Group, GroupRecord>
	implements GroupRepository
{
	protected toRecord(group: Group): GroupRecord {
		return group.toRecord();
	}

	protected restore(record: GroupRecord): Group {
		return Group.restore(record);
	}
}
