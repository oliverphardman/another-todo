import type { IncomingMessage, Server } from "node:http";
import type { Duplex } from "node:stream";
import { WebSocket, WebSocketServer } from "ws";
import type { ChangeChannel } from "../../application/change-channel";
import { CHANGED_MESSAGE } from "../../application/change-notifier";
import type { Realtime } from "../../composition/platform";
import type { Authenticator } from "../../http/authenticator";

export const REALTIME_PATH = "/realtime";

export class WebSocketRealtime implements Realtime, ChangeChannel {
	readonly channel: ChangeChannel = this;
	private readonly sockets = new Map<string, Set<WebSocket>>();
	private readonly server = new WebSocketServer({ noServer: true });

	constructor(private readonly authenticator: Authenticator) {}

	attach(server: Server): void {
		server.on("upgrade", (request, socket, head) => {
			this.upgrade(request, socket, head);
		});
		server.on("close", () => {
			this.server.close();
		});
	}

	async deliver(userId: string): Promise<void> {
		for (const socket of this.sockets.get(userId) ?? []) {
			socket.send(CHANGED_MESSAGE);
		}
	}

	private upgrade(request: IncomingMessage, socket: Duplex, head: Buffer): void {
		const url = new URL(request.url!, "http://localhost");
		if (url.pathname !== REALTIME_PATH) {
			socket.destroy();
			return;
		}
		const token = url.searchParams.get("token");
		const credentials = {
			header: (name: string) =>
				name.toLowerCase() === "authorization" && token ? `Bearer ${token}` : undefined,
		};
		this.authenticator.authenticate(credentials).then(
			(owner) => {
				this.server.handleUpgrade(request, socket, head, (connection) => {
					this.track(owner, connection);
				});
			},
			() => {
				socket.end("HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n");
			},
		);
	}

	private track(owner: string, connection: WebSocket): void {
		const open = this.sockets.get(owner) ?? new Set<WebSocket>();
		open.add(connection);
		this.sockets.set(owner, open);
		connection.on("close", () => {
			open.delete(connection);
			if (open.size === 0) {
				this.sockets.delete(owner);
			}
		});
	}
}
