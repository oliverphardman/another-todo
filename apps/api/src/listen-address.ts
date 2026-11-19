export interface ListenAddress {
	readonly host: string;
	readonly port: number;
}

const DEFAULT_ADDRESS = "localhost:3000";

export function parseListenAddress(value: string | undefined): ListenAddress {
	const address = value ?? DEFAULT_ADDRESS;
	const separator = address.lastIndexOf(":");
	const host = address.slice(0, separator);
	const port = Number(address.slice(separator + 1));
	if (separator <= 0 || !Number.isInteger(port) || port < 0 || port > 65535) {
		throw new Error(`Invalid listen address: ${address}`);
	}
	return { host, port };
}
