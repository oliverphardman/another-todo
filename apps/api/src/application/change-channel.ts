export interface ChangeChannel {
	deliver(userId: string): Promise<void>;
}
