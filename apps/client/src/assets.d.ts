declare module "*.jpg" {
	const source: import("react-native").ImageSourcePropType;
	export default source;
}

declare module "*.mp3" {
	const source: number;
	export default source;
}
