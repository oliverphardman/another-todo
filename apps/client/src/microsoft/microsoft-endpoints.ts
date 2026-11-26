export const MICROSOFT_SCOPES = ["openid", "offline_access", "Tasks.ReadWrite"] as const;

export const MICROSOFT_ENDPOINTS = {
	authorization: "https://login.microsoftonline.com/consumers/oauth2/v2.0/authorize",
	token: "https://login.microsoftonline.com/consumers/oauth2/v2.0/token",
} as const;
