import * as DocumentPicker from "expo-document-picker";
import type { PickedFile } from "./attachment";
import type { FilePicker } from "./attachment-gateway";

export class ExpoFilePicker implements FilePicker {
	async pick(): Promise<PickedFile | null> {
		const result = await DocumentPicker.getDocumentAsync({
			copyToCacheDirectory: true,
			multiple: false,
		});
		if (result.canceled) {
			return null;
		}
		const asset = result.assets[0]!;
		const contentType = asset.mimeType ?? "application/octet-stream";
		return {
			name: asset.name,
			contentType,
			size: asset.size ?? asset.file?.size ?? 0,
			body: asset.file ?? { uri: asset.uri, name: asset.name, type: contentType },
		};
	}
}
