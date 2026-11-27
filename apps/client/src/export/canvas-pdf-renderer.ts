import type { I18n } from "../i18n/i18n";
import type { PrintableBook } from "../print/list-print-document";
import { Bytes } from "./bytes";
import { ImagePdf } from "./image-pdf";
import { A4, PdfLayout, type PlacedText, type TextStyle } from "./pdf-layout";
import type { PdfRenderer } from "./pdf-renderer";

const SCALE = 2;
const QUALITY = 0.92;
const FAMILY = "-apple-system, 'Segoe UI', Roboto, Arial, sans-serif";

export class CanvasPdfRenderer implements PdfRenderer {
	constructor(
		private readonly createCanvas: () => HTMLCanvasElement = () => document.createElement("canvas"),
	) {}

	async render(book: PrintableBook, i18n: I18n): Promise<Uint8Array> {
		const canvas = this.createCanvas();
		canvas.width = A4.width * SCALE;
		canvas.height = A4.height * SCALE;
		const context = canvas.getContext("2d");
		if (context === null) {
			throw new Error("A drawing surface is not available");
		}
		const layout = new PdfLayout((text, style) => {
			context.font = CanvasPdfRenderer.font(style);
			return context.measureText(text).width;
		});
		const pages = layout.pages(book, i18n).map((texts) => {
			context.setTransform(SCALE, 0, 0, SCALE, 0, 0);
			context.fillStyle = "#ffffff";
			context.fillRect(0, 0, A4.width, A4.height);
			texts.forEach((text) => CanvasPdfRenderer.draw(context, text));
			const url = canvas.toDataURL("image/jpeg", QUALITY);
			return {
				jpeg: Bytes.fromBase64(url.slice(url.indexOf(",") + 1)),
				width: canvas.width,
				height: canvas.height,
			};
		});
		return ImagePdf.build(pages, A4);
	}

	private static font({ size, bold }: TextStyle): string {
		return `${bold ? "600" : "400"} ${size}px ${FAMILY}`;
	}

	private static draw(context: CanvasRenderingContext2D, placed: PlacedText): void {
		context.font = CanvasPdfRenderer.font(placed);
		context.fillStyle = placed.color;
		context.fillText(placed.text, placed.x, placed.y);
		if (placed.struck) {
			context.fillRect(placed.x, placed.y - placed.size * 0.32, placed.width, 0.7);
		}
	}
}
