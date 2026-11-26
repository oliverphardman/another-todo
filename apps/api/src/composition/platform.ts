import type { Server } from "node:http";
import type { Router } from "express";
import type { ChangeChannel } from "../application/change-channel";
import type { DataStore } from "../application/data-store";
import type { MediaStorage } from "../application/media-storage";
import type { UserDirectory } from "../application/user-directory";
import type { Authenticator } from "../http/authenticator";

export type Env = Readonly<Record<string, string | undefined>>;

export type AuthenticationMode = "none" | "password" | "external";

export interface SignIn {
	readonly url: string;
	readonly clientId: string;
}

export interface Identity {
	readonly mode: AuthenticationMode;
	readonly providers: readonly string[];
	readonly authenticator: Authenticator;
	readonly directory: UserDirectory;
	readonly issuer: string | null;
	readonly signIn: SignIn | null;
	readonly router: Router | null;
}

export interface Media {
	readonly storage: MediaStorage;
	readonly router: Router | null;
}

export interface Realtime {
	readonly channel: ChangeChannel;
	readonly endpoint: string | null;
	attach(server: Server): void;
}

export interface Platform {
	readonly data: DataStore;
	readonly media: Media;
	readonly identity: Identity;
	readonly realtime: Realtime;
}
