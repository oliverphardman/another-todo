import { ValidationError } from "../domain/errors";

export const MEGABYTE = 1024 * 1024;
export const DEFAULT_MAX_UPLOAD_BYTES = 10 * MEGABYTE;

const LARGEST_MEGABYTES = 1024;

export class UploadLimit {
	static parse(megabytes: string | null): number {
		if (megabytes === null) {
			return DEFAULT_MAX_UPLOAD_BYTES;
		}
		const value = Number(megabytes);
		if (!Number.isInteger(value) || value < 1 || value > LARGEST_MEGABYTES) {
			throw new ValidationError(
				`MAX_UPLOAD_MB must be a whole number from 1 to ${LARGEST_MEGABYTES}`,
			);
		}
		return value * MEGABYTE;
	}
}
