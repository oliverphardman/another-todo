import * as ImagePicker from "expo-image-picker";
import type { PickedPhoto } from "./photo";
import type { PhotoPicker } from "./photo-gateway";

export class ExpoPhotoPicker implements PhotoPicker {
	async pick(): Promise<PickedPhoto | null> {
		const result = await ImagePicker.launchImageLibraryAsync({
			mediaTypes: ["images"],
			allowsMultipleSelection: false,
			quality: 1,
		});
		if (result.canceled) {
			return null;
		}
		const asset = result.assets[0]!;
		const contentType = asset.mimeType ?? "image/jpeg";
		const name = asset.fileName ?? "photo";
		return {
			name,
			contentType,
			size: asset.fileSize ?? asset.file?.size ?? 0,
			body: asset.file ?? { uri: asset.uri, name, type: contentType },
		};
	}
}
