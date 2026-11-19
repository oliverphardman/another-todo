import { Share, type ShareRecord } from "../domain/share";
import type { ShareRepository } from "../domain/share-repository";
import { DynamoRepository } from "./dynamo-repository";

export class DynamoShareRepository
	extends DynamoRepository<Share, ShareRecord>
	implements ShareRepository
{
	protected toRecord(share: Share): ShareRecord {
		return share.toRecord();
	}

	protected restore(record: ShareRecord): Share {
		return Share.restore(record);
	}
}
