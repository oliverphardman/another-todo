import { Bytes } from "./bytes";

export interface ZipEntry {
	readonly path: string;
	readonly text: string;
}

const LOCAL_SIGNATURE = 0x04034b50;
const CENTRAL_SIGNATURE = 0x02014b50;
const END_SIGNATURE = 0x06054b50;
const VERSION = 20;
const UTF8_NAMES = 0x0800;
const STORED = 0;
const FIRST_DOS_DAY = 0x0021;
const POLYNOMIAL = 0xedb88320;

const CRC_TABLE: readonly number[] = Array.from({ length: 256 }, (_, index) => {
	let value = index;
	for (let bit = 0; bit < 8; bit++) {
		value = value & 1 ? POLYNOMIAL ^ (value >>> 1) : value >>> 1;
	}
	return value >>> 0;
});

type Field = readonly [size: 2 | 4, value: number];

export class ZipArchive {
	static build(entries: readonly ZipEntry[]): Uint8Array {
		const files: Uint8Array[] = [];
		const directory: Uint8Array[] = [];
		let offset = 0;
		for (const entry of entries) {
			const name = Bytes.utf8(entry.path);
			const data = Bytes.utf8(entry.text);
			const shared: Field[] = [
				[2, VERSION],
				[2, UTF8_NAMES],
				[2, STORED],
				[2, 0],
				[2, FIRST_DOS_DAY],
				[4, ZipArchive.checksum(data)],
				[4, data.length],
				[4, data.length],
				[2, name.length],
				[2, 0],
			];
			const local = Bytes.concat([
				ZipArchive.record([[4, LOCAL_SIGNATURE], ...shared]),
				name,
				data,
			]);
			directory.push(
				ZipArchive.record([
					[4, CENTRAL_SIGNATURE],
					[2, VERSION],
					...shared,
					[2, 0],
					[2, 0],
					[2, 0],
					[4, 0],
					[4, offset],
				]),
				name,
			);
			files.push(local);
			offset += local.length;
		}
		const central = Bytes.concat(directory);
		const end = ZipArchive.record([
			[4, END_SIGNATURE],
			[2, 0],
			[2, 0],
			[2, entries.length],
			[2, entries.length],
			[4, central.length],
			[4, offset],
			[2, 0],
		]);
		return Bytes.concat([...files, central, end]);
	}

	static checksum(data: Uint8Array): number {
		let crc = 0xffffffff;
		for (const byte of data) {
			crc = CRC_TABLE[(crc ^ byte) & 0xff]! ^ (crc >>> 8);
		}
		return (crc ^ 0xffffffff) >>> 0;
	}

	private static record(fields: readonly Field[]): Uint8Array {
		const bytes = new Uint8Array(fields.reduce((total, [size]) => total + size, 0));
		const view = new DataView(bytes.buffer);
		let offset = 0;
		for (const [size, value] of fields) {
			if (size === 2) {
				view.setUint16(offset, value, true);
			} else {
				view.setUint32(offset, value, true);
			}
			offset += size;
		}
		return bytes;
	}
}
