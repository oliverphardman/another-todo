import { Bytes } from "./bytes";

export interface PageImage {
	readonly jpeg: Uint8Array;
	readonly width: number;
	readonly height: number;
}

export interface PageSize {
	readonly width: number;
	readonly height: number;
}

const OBJECTS_BEFORE_PAGES = 2;
const OBJECTS_PER_PAGE = 3;

export class ImagePdf {
	static build(pages: readonly PageImage[], size: PageSize): Uint8Array {
		const first = (index: number) => OBJECTS_BEFORE_PAGES + 1 + index * OBJECTS_PER_PAGE;
		const kids = pages.map((_, index) => `${first(index)} 0 R`).join(" ");
		const objects: Uint8Array[][] = [
			[Bytes.utf8("<< /Type /Catalog /Pages 2 0 R >>")],
			[Bytes.utf8(`<< /Type /Pages /Count ${pages.length} /Kids [${kids}] >>`)],
		];
		pages.forEach((page, index) => {
			const id = first(index);
			const draw = Bytes.utf8(`q ${size.width} 0 0 ${size.height} 0 0 cm /Page Do Q`);
			objects.push(
				[
					Bytes.utf8(
						`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${size.width} ${size.height}] /Resources << /XObject << /Page ${id + 2} 0 R >> >> /Contents ${id + 1} 0 R >>`,
					),
				],
				ImagePdf.stream("", draw),
				ImagePdf.stream(
					`/Type /XObject /Subtype /Image /Width ${page.width} /Height ${page.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode `,
					page.jpeg,
				),
			);
		});
		return ImagePdf.assemble(objects);
	}

	private static stream(dictionary: string, data: Uint8Array): Uint8Array[] {
		return [
			Bytes.utf8(`<< ${dictionary}/Length ${data.length} >>\nstream\n`),
			data,
			Bytes.utf8("\nendstream"),
		];
	}

	private static assemble(objects: readonly (readonly Uint8Array[])[]): Uint8Array {
		const parts: Uint8Array[] = [Bytes.utf8("%PDF-1.4\n%âãÏÓ\n")];
		let offset = parts[0]!.length;
		const offsets = objects.map((body, index) => {
			const object = Bytes.concat([
				Bytes.utf8(`${index + 1} 0 obj\n`),
				...body,
				Bytes.utf8("\nendobj\n"),
			]);
			const start = offset;
			parts.push(object);
			offset += object.length;
			return start;
		});
		const entries = offsets.map((start) => `${String(start).padStart(10, "0")} 00000 n \n`);
		parts.push(
			Bytes.utf8(
				`xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${entries.join("")}trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${offset}\n%%EOF\n`,
			),
		);
		return Bytes.concat(parts);
	}
}
