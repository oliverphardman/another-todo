import * as Print from "expo-print";
import { Platform } from "react-native";
import type { ListPrinter } from "./list-print-document";

export class ExpoListPrinter implements ListPrinter {
	async print(html: string): Promise<void> {
		if (Platform.OS === "web") {
			await ExpoListPrinter.printInFrame(html);
			return;
		}
		await Print.printAsync({ html });
	}

	private static printInFrame(html: string): Promise<void> {
		return new Promise((resolve) => {
			const frame = document.createElement("iframe");
			frame.setAttribute("aria-hidden", "true");
			frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;";
			frame.onload = () => {
				const target = frame.contentWindow!;
				target.onafterprint = () => {
					frame.remove();
					resolve();
				};
				target.focus();
				target.print();
			};
			frame.srcdoc = html;
			document.body.appendChild(frame);
		});
	}
}
