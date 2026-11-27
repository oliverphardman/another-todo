const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
const REPLACEMENT = 0xfffd;

export class Bytes {
	static utf8(text: string): Uint8Array {
		const bytes: number[] = [];
		for (const character of text) {
			const point = Bytes.scalar(character.codePointAt(0)!);
			if (point < 0x80) {
				bytes.push(point);
			} else if (point < 0x800) {
				bytes.push(0xc0 | (point >> 6), 0x80 | (point & 0x3f));
			} else if (point < 0x10000) {
				bytes.push(0xe0 | (point >> 12), 0x80 | ((point >> 6) & 0x3f), 0x80 | (point & 0x3f));
			} else {
				bytes.push(
					0xf0 | (point >> 18),
					0x80 | ((point >> 12) & 0x3f),
					0x80 | ((point >> 6) & 0x3f),
					0x80 | (point & 0x3f),
				);
			}
		}
		return Uint8Array.from(bytes);
	}

	static concat(parts: readonly Uint8Array[]): Uint8Array {
		const joined = new Uint8Array(parts.reduce((total, part) => total + part.length, 0));
		let offset = 0;
		for (const part of parts) {
			joined.set(part, offset);
			offset += part.length;
		}
		return joined;
	}

	static toBase64(bytes: Uint8Array): string {
		const groups: string[] = [];
		for (let index = 0; index < bytes.length; index += 3) {
			const size = Math.min(3, bytes.length - index);
			const value =
				(bytes[index]! << 16) | ((bytes[index + 1] ?? 0) << 8) | (bytes[index + 2] ?? 0);
			const characters = [18, 12, 6, 0].map((shift) => ALPHABET[(value >> shift) & 0x3f]!);
			groups.push(characters.slice(0, size + 1).join("") + "=".repeat(3 - size));
		}
		return groups.join("");
	}

	static fromBase64(text: string): Uint8Array {
		const digits = text.replace(/[^A-Za-z0-9+/]/g, "");
		const bytes = new Uint8Array(Math.floor((digits.length * 3) / 4));
		let buffer = 0;
		let bits = 0;
		let length = 0;
		for (const digit of digits) {
			buffer = ((buffer << 6) | ALPHABET.indexOf(digit)) & 0xffffff;
			bits += 6;
			if (bits >= 8) {
				bits -= 8;
				bytes[length++] = (buffer >> bits) & 0xff;
			}
		}
		return bytes;
	}

	private static scalar(point: number): number {
		return point >= 0xd800 && point <= 0xdfff ? REPLACEMENT : point;
	}
}
