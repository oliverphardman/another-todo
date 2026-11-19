const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

const FORKS = {
	macos: "react-native-macos",
	windows: "react-native-windows",
};

config.resolver.platforms = [
	...new Set([...(config.resolver.platforms ?? []), "macos", "windows"]),
];

const resolveWithExpo = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
	const fork = FORKS[platform];
	if (
		fork !== undefined &&
		(moduleName === "react-native" || moduleName.startsWith("react-native/"))
	) {
		const redirected = moduleName.replace(/^react-native/, fork);
		return (resolveWithExpo ?? context.resolveRequest)(context, redirected, platform);
	}
	return (resolveWithExpo ?? context.resolveRequest)(context, moduleName, platform);
};

const originalRunBefore = config.serializer.getModulesRunBeforeMainModule;

config.serializer.getModulesRunBeforeMainModule = (entryFilePath) => {
	const modules = originalRunBefore ? originalRunBefore(entryFilePath) : [];
	try {
		modules.push(require.resolve("react-native-macos/Libraries/Core/InitializeCore"));
		modules.push(require.resolve("react-native-windows/Libraries/Core/InitializeCore"));
	} catch {
		return modules;
	}
	return modules;
};

module.exports = config;
