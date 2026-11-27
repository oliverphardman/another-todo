import { crc32 } from "node:zlib";

export function unzip(archive: Uint8Array): Map<string, string> {
	const buffer = Buffer.from(archive);
	const end = buffer.length - 22;
	if (buffer.readUInt32LE(end) !== 0x06054b50) {
		throw new Error("No end of central directory");
	}
	const files = new Map<string, string>();
	let entry = buffer.readUInt32LE(end + 16);
	for (let index = 0; index < buffer.readUInt16LE(end + 10); index++) {
		const checksum = buffer.readUInt32LE(entry + 16);
		const size = buffer.readUInt32LE(entry + 20);
		const nameLength = buffer.readUInt16LE(entry + 28);
		const local = buffer.readUInt32LE(entry + 42);
		const name = buffer.toString("utf8", entry + 46, entry + 46 + nameLength);
		const start = local + 30 + buffer.readUInt16LE(local + 26);
		const data = buffer.subarray(start, start + size);
		if (crc32(data) !== checksum) {
			throw new Error(`Bad checksum for ${name}`);
		}
		files.set(name, data.toString("utf8"));
		entry += 46 + nameLength;
	}
	return files;
}
