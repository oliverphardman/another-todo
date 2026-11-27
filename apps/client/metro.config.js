const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

const FORKS = {
	macos: "react-native-macos",
	windows: "react-native-windows",
};

const ASSET_REGISTRY = "@react-native/assets-registry/";

config.resolver.platforms = [
	...new Set([...(config.resolver.platforms ?? []), "macos", "windows"]),
];

const resolveWithExpo = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
	const resolve = resolveWithExpo ?? context.resolveRequest;
	const fork = FORKS[platform];
	if (fork === undefined) {
		return resolve(context, moduleName, platform);
	}
	if (moduleName.startsWith(ASSET_REGISTRY)) {
		const originModulePath = require.resolve(`${fork}/package.json`);
		return resolve({ ...context, originModulePath }, moduleName, platform);
	}
	const redirected = moduleName.replace(/^react-native(?=\/|$)/, fork);
	return resolve(context, redirected, platform);
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
